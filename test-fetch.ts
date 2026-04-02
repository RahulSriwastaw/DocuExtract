async function run() {
  const res = await fetch('http://localhost:3000/api/get-server-folders');
  const text = await res.text();
  console.log('STATUS:', res.status);
  console.log('BODY:', text.substring(0, 200));
}
run().catch(console.error);
