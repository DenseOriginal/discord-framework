export namespace Status {
  export interface Error {
    status: 'error';
    message: string;
  }

  export interface Succes {
    status: 'succes';
  }
}
