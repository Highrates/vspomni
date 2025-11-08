const users = [
  { name: 'Alice', age: 20 },
  { name: 'Bob', age: 30 },
  { name: 'Charlie', age: 20 },
]

//
//   20: [
//   { name: 'Alice', age: 20 },
//   { name: 'Charlie', age: 20 },
// ],
//   30: [
//   { name: 'Bob', age: 30 },
// ]
// }

const groupBy = (arr, key) => {
  let group = []

  arr.map((item, index) => {
    // console.log(item.age)
    group.push(item.age)
  })
  let newArr = new Set([...group]) // console
  //   .log(Array.from(new Set(group)))
  // console.log({
  //   newArr,
  // })
  // [newArr]
  //   .reduce((acc, curVal) => curVal, {})
  console.log([newArr].reduce((acc, curVal) => curVal, {}))
  const res = Object.assign(...Array.from(newArr, (v) => ({ [v]: [] })))

  console.log(res)
}

groupBy(users)
