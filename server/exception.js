// exception.js

// ErrorTuple 类（模拟 NamedTuple）
class ErrorTuple {
  constructor(code, msg) {
    this.code = code;
    this.msg = msg;
  }
}

// ErrorEnum
const ErrorEnum = {
  IP_BLOCK: new ErrorTuple(300012, "网络连接异常，请检查网络设置或重启试试"),
  NOTE_ABNORMAL: new ErrorTuple(-510001, "笔记状态异常，请稍后查看"),
  NOTE_SECRETE_FAULT: new ErrorTuple(-510001, "当前内容无法展示"),
  SIGN_FAULT: new ErrorTuple(
    300015,
    "浏览器异常，请尝试关闭/卸载风险插件或重启试试！"
  ),
  SESSION_EXPIRED: new ErrorTuple(-100, "登录已过期"),
};

// 自定义异常类
class DataFetchError extends Error {
  constructor(message, response) {
    super(message);
    this.name = "DataFetchError";
    this.response = response;
  }
}

class IPBlockError extends Error {
  constructor(message, response) {
    super(message);
    this.name = "IPBlockError";
    this.response = response;
  }
}

class SignError extends Error {
  constructor(message, response) {
    super(message);
    this.name = "SignError";
    this.response = response;
  }
}

class NeedVerifyError extends Error {
  constructor(message, response, verify_type, verify_uuid) {
    super(message);
    this.name = "NeedVerifyError";
    this.response = response;
    this.verify_type = verify_type;
    this.verify_uuid = verify_uuid;
  }
}

export { ErrorEnum, DataFetchError, IPBlockError, SignError, NeedVerifyError };
