/* eslint-disable no-console */
// scripts/realtime-test.js
// Verifies server-side Socket.IO + MongoDB change streams by:
// 1) connecting a client and subscribing to events
// 2) creating a menu item (expect menu:created)
// 3) creating an order using that menu item (expect order:created)

import { io } from 'socket.io-client';

const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';
const API = `${BASE_URL}/api`;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  console.log(`[RT] Using BASE_URL=${BASE_URL}`);

  const socket = io(BASE_URL, { transports: ['websocket', 'polling'] });

  let gotMenu = false;
  let gotOrder = false;

  const doneOrTimeout = (timeoutMs) => new Promise((resolve) => {
    const to = setTimeout(() => resolve(false), timeoutMs);
    const check = setInterval(() => {
      if (gotMenu && gotOrder) {
        clearTimeout(to);
        clearInterval(check);
        resolve(true);
      }
    }, 100);
  });

  socket.on('connect', () => console.log('[RT] Socket connected', socket.id));
  socket.on('disconnect', (reason) => console.log('[RT] Socket disconnected', reason));

  socket.on('menu:created', (doc) => {
    console.log('[RT] menu:created received:', doc && doc._id);
    gotMenu = true;
  });

  socket.on('order:created', (doc) => {
    console.log('[RT] order:created received:', doc && doc._id);
    gotOrder = true;
  });

  // 1) Find any existing user to act as vendor (admin is fine)
  console.log('[RT] Fetching users...');
  const usersRes = await fetch(`${API}/auth/users?active=true`);
  if (!usersRes.ok) throw new Error(`Users fetch failed: ${usersRes.status}`);
  const usersData = await usersRes.json();
  const anyUser = usersData.users && usersData.users[0];
  if (!anyUser) throw new Error('No users found; ensure admin exists');
  const vendorId = anyUser._id;

  // 2) Register a temp customer
  const uniq = Date.now();
  const regRes = await fetch(`${API}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: `rt_customer_${uniq}@example.com`,
      password: 'testpass1',
      name: 'RT Customer',
      role: 'customer'
    })
  });
  if (!regRes.ok) {
    const t = await regRes.text();
    throw new Error(`Register failed: ${regRes.status} ${t}`);
  }
  const regData = await regRes.json();
  const customerId = regData.user && regData.user._id;
  if (!customerId) throw new Error('Customer registration did not return user._id');

  // 3) Create a menu item (expect menu:created)
  const menuRes = await fetch(`${API}/menu`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: `RT Item ${uniq}`,
      price: 99,
      category: 'Main Course',
      available: true,
      vendor: vendorId,
      stock: 5,
      description: 'Real-time test item'
    })
  });
  if (!menuRes.ok) {
    const t = await menuRes.text();
    throw new Error(`Menu create failed: ${menuRes.status} ${t}`);
  }
  const menuData = await menuRes.json();
  const menuId = menuData.item && menuData.item._id;
  if (!menuId) throw new Error('Menu response missing item._id');

  // small delay to allow change stream to emit
  await sleep(500);

  // 4) Create an order using that menu item (expect order:created)
  const orderRes = await fetch(`${API}/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      customer: customerId,
      vendor: vendorId,
      items: [{ menuItem: menuId, quantity: 1 }],
      status: 'ordered'
    })
  });
  if (!orderRes.ok) {
    const t = await orderRes.text();
    throw new Error(`Order create failed: ${orderRes.status} ${t}`);
  }

  // wait until both events observed or timeout
  const ok = await doneOrTimeout(15000);

  socket.close();

  if (!ok) {
    console.error('[RT] Did not receive expected realtime events in time');
    process.exit(1);
  }
  console.log('[RT] SUCCESS: realtime events received for menu and order');
  process.exit(0);
}

main().catch((e) => {
  console.error('[RT] ERROR', e);
  process.exit(1);
});
