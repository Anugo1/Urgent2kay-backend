import { Request, Response } from 'express';
import * as UserService from '../services/user.service';

export const getBenefactors = async (req: Request, res: Response) => {
try {
const benefactors = await UserService.getAllBenefactors();
res.json(benefactors);
} catch (error) {
console.error(error);
res.status(500).json({ message: 'Failed to fetch benefactors' });
}
};