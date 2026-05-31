'use strict';

const queue = [];

async function enqueueEmail(userID, emailRequest) {
  queue.push({ userID, emailRequest });
  console.log(`[Queue] Job enqueued (Subject: '${emailRequest.subject}'). Queue size: ${queue.length}`);
}

function dequeueEmail() {
  return queue.shift() || null;
}

module.exports = { enqueueEmail, dequeueEmail };
