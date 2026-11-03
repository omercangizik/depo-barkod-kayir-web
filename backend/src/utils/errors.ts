export class AppError extends Error {
  status: number;
  code: string;

  constructor(message: string, status = 400, code = "APP_ERROR") {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Kayıt bulunamadı") {
    super(message, 404, "NOT_FOUND");
  }
}

export class ConflictError extends AppError {
  constructor(message = "Kayıt zaten mevcut") {
    super(message, 409, "CONFLICT");
  }
}

export class SheetsError extends AppError {
  constructor(message = "Google Sheets bağlantı hatası") {
    super(message, 503, "SHEETS_ERROR");
  }
}
