
console.log('init');
function go (i) {
  if (i > 9) return -1;
  console.log(i)
  process.nextTick(function(){
    go (i + 1);
  });
}

go (0);
