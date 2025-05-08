/**
 * Uses binary search to determine the index at which the value should be
 * inserted into the sorted array to maintain sorted order.
 *
 * @param array The sorted array.
 * @param item The value to insert.
 * @returns The index at which the value should be inserted.
 */
export function sortedIndex<T>(
  array: T[],
  item: T,
  key = (value: T): number => value as unknown as number
): number {
  let low = 0;
  let high = array.length;

  const itemKey = key(item);

  while (low < high) {
    const mid = Math.floor((low + high) / 2);
    if (key(array[mid]) < itemKey) {
      low = mid + 1;
    } else {
      high = mid;
    }
  }
  return low;
}
