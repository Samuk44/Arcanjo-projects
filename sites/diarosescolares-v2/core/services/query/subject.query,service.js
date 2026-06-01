import {
  readIndexIds,
  readManyByIds,
  createError,
  normalizeText,
  sortByName,
} from "./query.helpers.js";

const SUBJECTS_PATH = "subjects";

function normalizeSubject(id, data) {
  return {
    id,
    name: data?.name ?? "",
    schoolId: data?.schoolId ?? "",
    createdAt: data?.createdAt ?? null,
  };
}

export async function getSubjectsBySchool(schoolId) {
  const id = normalizeText(schoolId);
  if (!id) throw createError("schoolId é obrigatório.");

  const ids = await readIndexIds(`indexes/subjectsBySchool/${id}`);
  const subjects = await readManyByIds(SUBJECTS_PATH, ids, normalizeSubject);

  return subjects.sort(sortByName);
}

export const subjectQueryService = {
  getSubjectsBySchool,
};
