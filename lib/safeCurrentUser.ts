import { currentUser, type User } from '@clerk/nextjs/server';

export async function safeCurrentUser(): Promise<User | null> {
  try {
    return await currentUser();
  } catch (error) {
    console.error('Error fetching Clerk current user:', error);
    return null;
  }
}
