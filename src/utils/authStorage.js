const REMEMBERED_USER_ID_PREFIX = 'rememberedUserId:';

export const clearSessionStorage = () => {
  for (let index = localStorage.length - 1; index >= 0; index -= 1) {
    const key = localStorage.key(index);
    if (key && !key.startsWith(REMEMBERED_USER_ID_PREFIX)) {
      localStorage.removeItem(key);
    }
  }
};
