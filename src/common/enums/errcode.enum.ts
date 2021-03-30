export enum Code {
  OK = 0,
  BAD_PARAMS = 400,
  UNAUTHORIZATION = 401,
  FORBIDDEN = 403,
  INVALID_HEADERS = 405,
  SERVER_ERROR = 500,
  INVALID_IP = 501,

  NOT_IMPLEMENTED = 1000,
  INVALID_INVITE_CODE = 1001,
  USERNAME_EXIST = 1002,
  USERNAME_NOT_FOUND = 1003,
  INVALID_PASSWORD = 1004,
  USER_LOCKED = 1005,
  USER_NOT_AUTHORIZED = 1006,
  BALANCE_NOT_ENOUGH = 1009,
  OPERATION_FORBIDDEN = 1010,
  REGISTER_CLOSED = 1011,
  INVALID_SMS_CODE = 1012,
  SMS_FREQUENTLY = 1013,
  USER_NOT_FOUND = 1014,
  USER_EXIST = 1015
};