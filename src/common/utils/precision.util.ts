import NP from 'number-precision';

type numType = number | string;

class Precision {

  public init() {
    NP.enableBoundaryChecking(false);
  }

  public strip(num: numType) {
    return NP.strip(num);
  }

  public plus(num1: numType, num2: numType, ...others: numType[]) {
    return NP.plus(num1, num2, ...others);
  }

  public minus(num1: numType, num2: numType, ...others: numType[]) {
    return NP.minus(num1, num2, ...others);
  }

  public times(num1: numType, num2: numType, ...others: numType[]) {
    return NP.times(num1, num2, ...others);
  }

  public divide(num1: numType, num2: numType, ...others: numType[]) {
    return NP.divide(num1, num2, ...others);
  }

  public round(num: numType, ratio: number) {
    return NP.round(num, ratio);
  }

}

export const np = new Precision();