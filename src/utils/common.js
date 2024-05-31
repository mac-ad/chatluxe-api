import { v4 as uuidv4 } from "uuid";

export const generateRandomUUID = () => {
  return uuidv4();
};

export const checkPermission = async (filePath, permission) => {
  try {
    await fs.access(filePath, permission);
    console.log(`process has ${permission} permission on ${filePath}`);
    return true;
  } catch (err) {
    return false;
    if (err.code === "EACCES") {
      console.error(
        `Process does not have ${permission} permission on ${filePath}`
      );
    } else {
      console.error(`Error checking permission:`, err);
    }
  }
};
