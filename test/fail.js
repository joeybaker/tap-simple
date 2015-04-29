import test from 'tape'

test('1 === 2', (t) => {
  t.plan(1)
  t.equal(1, 2)
})

test('2 === 1', (t) => {
  t.plan(1)
  t.equal(2, 1, 'these things are not the same')
})

test('{a: 404} === {a: 42}', (t) => {
  t.plan(1)
  console.log('comment in a failing test')
  t.deepEqual({a: 404}, {a: 42})
})

test('"Hell, world!" === "Hello, world!"', (t) => {
  t.plan(1)
  setTimeout(() => {
    t.equal('Hell, world!', 'Hello, world!')
  }, 100)
})
