import apiClient from '@/lib/axios';
import {
  ResumeSummary,
  ResumeDetail,
  ResumeVersionSummary,
  ResumeVersionDetail,
  ResumeCreatePayload,
  ResumeUpdatePayload,
  ResumeVersionCreatePayload,
} from '@/types/resume';

export const resumeDocumentService = {
  /**
   * Lists all resumes in the user's library.
   */
  async listResumes(search?: string, isArchived?: boolean): Promise<ResumeSummary[]> {
    const params: Record<string, string | boolean> = {};
    if (search && search.trim()) {
      params.search = search.trim();
    }
    if (typeof isArchived === 'boolean') {
      params.is_archived = isArchived;
    }
    const res = await apiClient.get<ResumeSummary[]>('/api/resumes', { params });
    return res.data;
  },

  /**
   * Fetches a resume with its active version details.
   */
  async getResume(id: string): Promise<ResumeDetail> {
    const res = await apiClient.get<ResumeDetail>(`/api/resumes/${id}`);
    return res.data;
  },

  /**
   * Creates a new resume document with an initial version snapshot.
   */
  async createResume(payload: ResumeCreatePayload): Promise<ResumeDetail> {
    const res = await apiClient.post<ResumeDetail>('/api/resumes', payload);
    return res.data;
  },

  /**
   * Updates resume metadata (title, target role, archived).
   */
  async updateResume(id: string, payload: ResumeUpdatePayload): Promise<ResumeDetail> {
    const res = await apiClient.patch<ResumeDetail>(`/api/resumes/${id}`, payload);
    return res.data;
  },

  /**
   * Duplicates an existing resume.
   */
  async duplicateResume(id: string): Promise<ResumeDetail> {
    const res = await apiClient.post<ResumeDetail>(`/api/resumes/${id}/duplicate`);
    return res.data;
  },

  /**
   * Deletes a resume document and all its versions.
   */
  async deleteResume(id: string): Promise<void> {
    await apiClient.delete(`/api/resumes/${id}`);
  },

  /**
   * Lists all versions of a specific resume.
   */
  async listVersions(resumeId: string): Promise<ResumeVersionSummary[]> {
    const res = await apiClient.get<ResumeVersionSummary[]>(`/api/resumes/${resumeId}/versions`);
    return res.data;
  },

  /**
   * Retrieves a specific historical version snapshot.
   */
  async getVersion(resumeId: string, versionId: string): Promise<ResumeVersionDetail> {
    const res = await apiClient.get<ResumeVersionDetail>(
      `/api/resumes/${resumeId}/versions/${versionId}`
    );
    return res.data;
  },

  /**
   * Creates/appends a new version snapshot and activates it.
   */
  async createVersion(
    resumeId: string,
    payload: ResumeVersionCreatePayload
  ): Promise<ResumeVersionDetail> {
    const res = await apiClient.post<ResumeVersionDetail>(
      `/api/resumes/${resumeId}/versions`,
      payload
    );
    return res.data;
  },

  /**
   * Restores an older version snapshot into a newly incremented version.
   */
  async restoreVersion(resumeId: string, versionId: string): Promise<ResumeVersionDetail> {
    const res = await apiClient.post<ResumeVersionDetail>(
      `/api/resumes/${resumeId}/restore/${versionId}`
    );
    return res.data;
  },
};
