"use server";

import { redirect } from "next/navigation";

import { AuthorizationError, requireRole } from "../../../lib/auth/require-role";
import { createClient } from "../../../lib/supabase/server";

const ADMIN_COURSES_PATH = "/admin/courses";
const COURSE_TITLE_MAX_LENGTH = 120;
const COURSE_SLUG_MAX_LENGTH = 80;
const COURSE_DESCRIPTION_MAX_LENGTH = 2_000;
const courseSlugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type CourseValues = {
  description: string;
  is_published: boolean;
  slug: string;
  title: string;
};

type CourseMutationError = { code?: string; message?: string } | null;
type CourseMutationResult = { error: CourseMutationError };

export type CourseMutationClient = {
  from: (table: "courses") => {
    delete: () => {
      eq: (column: "id", value: string) => PromiseLike<CourseMutationResult>;
    };
    insert: (course: CourseValues) => PromiseLike<CourseMutationResult>;
    update: (course: CourseValues) => {
      eq: (column: "id", value: string) => PromiseLike<CourseMutationResult>;
    };
  };
};

type CourseMutationClientFactory = () => Promise<CourseMutationClient>;
type CourseFormData = { get: (name: string) => unknown };
type Notice = "created" | "updated" | "deleted";
type ErrorCode = "forbidden" | "invalid" | "save";

function valueFrom(formData: CourseFormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : null;
}

function validateCourse(formData: CourseFormData): CourseValues | null {
  const title = valueFrom(formData, "title");
  const slug = valueFrom(formData, "slug");
  const description = valueFrom(formData, "description");
  const publishedValue = formData.get("is_published");

  if (
    !title ||
    title.length > COURSE_TITLE_MAX_LENGTH ||
    !slug ||
    slug.length > COURSE_SLUG_MAX_LENGTH ||
    !courseSlugPattern.test(slug) ||
    description === null ||
    description.length > COURSE_DESCRIPTION_MAX_LENGTH ||
    (publishedValue !== null && publishedValue !== "on")
  ) {
    return null;
  }

  return {
    description,
    is_published: publishedValue === "on",
    slug,
    title,
  };
}

function validCourseId(formData: CourseFormData) {
  const id = valueFrom(formData, "id");
  return id && uuidPattern.test(id) ? id : null;
}

async function isAdmin() {
  try {
    await requireRole("admin");
    return true;
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return false;
    }

    throw error;
  }
}

function completeWithNotice(notice: Notice): never {
  return redirect(`${ADMIN_COURSES_PATH}?notice=${notice}`);
}

function completeWithError(error: ErrorCode): never {
  return redirect(`${ADMIN_COURSES_PATH}?error=${error}`);
}

async function saveCourse(
  formData: CourseFormData,
  clientFactory: CourseMutationClientFactory,
  operation: (client: CourseMutationClient, course: CourseValues) => PromiseLike<CourseMutationResult>,
  notice: Extract<Notice, "created" | "updated">,
) {
  if (!(await isAdmin())) {
    return completeWithError("forbidden");
  }

  const course = validateCourse(formData);
  if (!course) {
    return completeWithError("invalid");
  }

  try {
    const client = await clientFactory();
    const { error } = await operation(client, course);
    if (error) {
      return completeWithError("save");
    }
  } catch {
    return completeWithError("save");
  }

  return completeWithNotice(notice);
}

export async function createCourse(
  formData: CourseFormData,
  clientFactory: CourseMutationClientFactory = defaultCourseClientFactory,
) {
  return saveCourse(formData, clientFactory, (client, course) => client.from("courses").insert(course), "created");
}

export async function updateCourse(
  formData: CourseFormData,
  clientFactory: CourseMutationClientFactory = defaultCourseClientFactory,
) {
  const id = validCourseId(formData);
  if (!id) {
    return completeWithError("invalid");
  }

  return saveCourse(
    formData,
    clientFactory,
    (client, course) => client.from("courses").update(course).eq("id", id),
    "updated",
  );
}

export async function deleteCourse(
  formData: CourseFormData,
  clientFactory: CourseMutationClientFactory = defaultCourseClientFactory,
) {
  if (!(await isAdmin())) {
    return completeWithError("forbidden");
  }

  const id = validCourseId(formData);
  if (!id) {
    return completeWithError("invalid");
  }

  try {
    const client = await clientFactory();
    const { error } = await client.from("courses").delete().eq("id", id);
    if (error) {
      return completeWithError("save");
    }
  } catch {
    return completeWithError("save");
  }

  return completeWithNotice("deleted");
}

function defaultCourseClientFactory() {
  return createClient() as unknown as Promise<CourseMutationClient>;
}
