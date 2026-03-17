import { attendees } from "../client/src/lib/attendees";

const testIds = ['93176107633', '208415155065', '9319401'];

for (const id of testIds) {
  const delegate = attendees.find(a => a.id === id);
  if (delegate) {
    console.log(`✅ ${id} → ${delegate.firstName} ${delegate.lastName} (${delegate.company})`);
  } else {
    console.log(`❌ ${id} → NOT FOUND in attendees list`);
  }
}
