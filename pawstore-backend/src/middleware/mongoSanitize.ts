import { Request, Response, NextFunction } from "express";

/**
 * Universal NoSQL Injection Prevention Middleware
 * Iterates through req.query, req.body, and req.params and strips keys starting with `$`
 */
const sanitizeObject = (obj: any) => {
  if (obj instanceof Object) {
    for (const key in obj) {
      if (key.startsWith("$")) {
        delete obj[key];
      } else if (typeof obj[key] === "object") {
        sanitizeObject(obj[key]);
      }
    }
  }
};

export const mongoSanitize = (req: Request, res: Response, next: NextFunction) => {
  sanitizeObject(req.body);
  sanitizeObject(req.query);
  sanitizeObject(req.params);
  next();
};
