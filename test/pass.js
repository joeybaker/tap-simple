import test from 'tape'

test('1 === 1', (t) => {
  t.plan(1)
  t.equal(1, 1)
})

test('2 === 2', (t) => {
  t.plan(1)
  t.equal(2, 2)
})

test('Does not error with comment', (t) => {
  t.plan(1)
  console.log('a comment')
  t.pass('can console.log')
  console.log('another comment')
})

test('many assertations', (t) => {
  const count = 10
  t.plan(count)

  for (let i = 0; i < count; i++) {
    t.pass('test succeeded')
  }
})
