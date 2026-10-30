/** Id dari form bisa diutak-atik; id yang bukan uuid dianggap tidak ada, bukan error 500 dari PostgreSQL. */
export const apakahUuid = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
