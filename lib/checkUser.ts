import { db } from './db';
import { safeCurrentUser } from './safeCurrentUser';

export const checkUser = async () => {
  const user = await safeCurrentUser();

  if (!user) {
    return null;
  }

  // Try to find the user in the database
  const loggedInUser = await db.user.findUnique({
    where: {
      clerkUserId: user.id,
    },
  });

  if (loggedInUser) {
    return loggedInUser;
  }

  // If user not in DB, create new user
  const newUser = await db.user.create({
    data: {
      clerkUserId: user.id,
      name: `${user.firstName} ${user.lastName}`,
      imageUrl: user.imageUrl,
      email: user.emailAddresses[0]?.emailAddress,
    },
  });

  return newUser;
};
