
function sort(arr, low = 0, high = arr.length - 1) { // utilizes the quicksort algorithm to sort the array of numbers
    if (low < high) {
      const p = partition(arr, low, high);
      sort(arr, low, p - 1);
      sort(arr, p + 1, high);
    }
    return arr;
  }
  
  function partition(arr, low, high) {
    // pivot = last element
    const pivot = arr[high];
    let i = low;
  
    for (let j = low; j < high; j++) {
      if (arr[j] <= pivot) {
        [arr[i], arr[j]] = [arr[j], arr[i]]; // swap
        i++;
      }
    }
    [arr[i], arr[high]] = [arr[high], arr[i]]; // place pivot
    return i;
  }
  

  // function to sort the array of numbers and find the median 
  function sortAndFindMedian(numbers) {
    if (numbers.length === 0) throw new Error('Empty array');
  
    sort(numbers); // sorts the numbers array using quicksort algorithm, used due it's efficiency
  
    const n = numbers.length;
    if (n % 2 === 0) {
        return (numbers[n / 2 - 1] + numbers[n / 2]) / 2
    }
    else {
        return numbers[Math.floor(n / 2)];
    }

  }
  
  const rl = require('readline').createInterface({ input: process.stdin, output: process.stdout }); // creates readline interface for the user to input their numbers


  console.log('Enter numbers separated by spaces (e.g. 1 2 3 4 5):'); // prompt the user for input
  rl.question('> ', line => {
    const numbers = line.trim().split(/\s+/).map(Number); // splits the input string into an array of numbers
    if (!numbers.length || numbers.some(Number.isNaN)) {
      console.error('Invalid input, use spaces between numbers only.');
      rl.close(); process.exit(1);
    }
    console.log('Median:', sortAndFindMedian(numbers));
    rl.close();
  });
  
  module.exports = { sortAndFindMedian, sort };
  