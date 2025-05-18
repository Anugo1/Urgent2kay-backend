import { RequestUser } from '../types';

/**
 * Helper function to safely get the user from request
 * Use this when you need to access user properties from req.user
 * @param reqUser The req.user object from Express request
 * @returns Typed RequestUser with appropriate properties
 */
export const getRequestUser = (reqUser: any): RequestUser => {
  if (!reqUser || typeof reqUser !== 'object') {
    throw new Error('User not authenticated');
  }
  
  if (!reqUser.id) {
    throw new Error('Invalid user object in request');
  }
  
  return reqUser as RequestUser;
}; 