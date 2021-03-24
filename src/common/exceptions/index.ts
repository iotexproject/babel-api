class Exception extends Error {

    constructor(public code: number, public message: string, public source?: string, public params?: any) {
      super();
    }
  
  }
  
  function Assert(condition: boolean, code: number, message: string) {
    if (!condition)
      throw new Exception(code, message);
  }
  
  export { Exception, Assert };
  