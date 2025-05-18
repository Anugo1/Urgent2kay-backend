// Example using UUID v4 for truly unique references
import { v4 as uuidv4 } from 'uuid';

export function generateReference(): string {
          return `transfer_${uuidv4()}`;
}