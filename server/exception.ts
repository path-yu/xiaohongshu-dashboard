export interface IErrorTuple {
  code: number;
  msg: string;
}

export class ErrorTuple implements IErrorTuple {
  constructor(public code: number, public msg: string) {}
}

export const ErrorEnum = {
  IP_BLOCK: new ErrorTuple(300012, "网络连接异常，请检查网络设置或重启试试"),
  NOTE_ABNORMAL: new ErrorTuple(-510001, "笔记状态异常，请稍后查看"),
  NOTE_SECRETE_FAULT: new ErrorTuple(-510001, "当前内容无法展示"),
  SIGN_FAULT: new ErrorTuple(
    300015,
    "浏览器异常，请尝试关闭/卸载风险插件或重启试试！"
  ),
  SESSION_EXPIRED: new ErrorTuple(-100, "登录已过期"),
} as const;

export class DataFetchError extends Error {
  constructor(message: string, public response: any) {
    super(message);
    this.name = "DataFetchError";
  }
}

export class IPBlockError extends Error {
  constructor(message: string, public response: any) {
    super(message);
    this.name = "IPBlockError";
  }
}

export class SignError extends Error {
  constructor(message: string, public response: any) {
    super(message);
    this.name = "SignError";
  }
}

export class NeedVerifyError extends Error {
  constructor(
    message: string,
    public response: any,
    public verify_type: string,
    public verify_uuid: string
  ) {
    super(message);
    this.name = "NeedVerifyError";
  }
}