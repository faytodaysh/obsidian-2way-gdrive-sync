import SparkMD5 from 'spark-md5';

export function calculateMD5(buffer: ArrayBuffer): string {
  const spark = new SparkMD5.ArrayBuffer();
  spark.append(buffer);
  return spark.end();
}
