const Datastore = require('./lib/datastore');

function measure(title, fn) {
  const start = process.hrtime.bigint();
  const result = fn();
  if (result && typeof result.then === 'function') {
    return result.then(() => {
      const end = process.hrtime.bigint();
      console.log(`${title}: ${(Number(end - start) / 1e6).toFixed(2)} ms`);
    });
  } else {
    const end = process.hrtime.bigint();
    console.log(`${title}: ${(Number(end - start) / 1e6).toFixed(2)} ms`);
  }
}

function createDocs(n) {
  const docs = [];
  for (let i = 0; i < n; i++) {
    docs.push({
      docNumber: i,
      category: i % 10,
      tags: [`tag-${i % 10}`],
      nested: {
        val: `val-${i % 10}`
      }
    });
  }
  return docs;
}

async function run() {
  const n = 20000;
  console.log(`Running benchmark with ${n} documents...\n`);
  const db = new Datastore({ inMemoryOnly: true });
  await db.ensureIndex({ fieldName: 'docNumber' });

  const docs = createDocs(n);
  
  // Insert
  await measure('[1] Inserting ' + n + ' docs', async () => {
    await db.insert(docs);
  });
  
  // Find by Index
  await measure('[2] Finding by indexed field', async () => {
    const doc = await db.findOne({ docNumber: n - 1 });
    if (!doc) throw new Error('Not found');
  });

  // Find all (no index)
  await measure('[3] Finding all documents (projection)', async () => {
    const res = await db.find({}, { docNumber: 1, nested: 1 });
    if (res.length !== n) throw new Error('Missing docs');
  });

  // Update
  await measure('[4] Updating ' + n + ' docs (field exists)', async () => {
    for (let i = 0; i < n; i += 10) {
      await db.update({ docNumber: i }, { $set: { category: i % 5 } });
    }
  });

  // Repeat find+projection for a stable reading (the optimization hotspot)
  const repeats = 20;
  await measure(`[5] Finding all docs with projection x${repeats}`, async () => {
    for (let i = 0; i < repeats; i++) {
      const res = await db.find({}, { docNumber: 1, nested: 1 });
      if (res.length !== n) { throw new Error('Missing docs'); }
    }
  });

  console.log('\nBenchmark complete.');
}

run().catch(console.error);
