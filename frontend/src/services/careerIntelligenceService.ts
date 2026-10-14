import apiClient from '@/lib/axios';
import {
  GenerateRoleVariantRequest,
  RoleVariantDraftResponse,
  SaveRoleVariantRequest,
  CompareVariantsRequest,
  VariantComparisonResponse,
  WritingSuggestionRequest,
  WritingSuggestionResponse,
  GenerateRoadmapRequest,
  CareerRoadmapResponse,
  MultiRoleCompareRequest,
  MultiRoleCompareResponse,
  ProjectRecommendRequest,
  ProjectRecommendResponse,
} from '@/types/careerIntelligence';

export const careerIntelligenceService = {
  /**
   * Generates a role-specific resume draft from an existing resume.
   */
  async generateRoleVariant(
    payload: GenerateRoleVariantRequest
  ): Promise<RoleVariantDraftResponse> {
    const res = await apiClient.post<RoleVariantDraftResponse>(
      '/api/career/variants/generate',
      payload
    );
    return res.data;
  },

  /**
   * Saves a role variant either as a new version or as an independent new document.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async saveRoleVariant(payload: SaveRoleVariantRequest): Promise<any> {
    const res = await apiClient.post('/api/career/variants/save', payload);
    return res.data;
  },

  /**
   * Compares two resume variants side-by-side with structured section diffs.
   */
  async compareVariants(payload: CompareVariantsRequest): Promise<VariantComparisonResponse> {
    const res = await apiClient.post<VariantComparisonResponse>(
      '/api/career/variants/compare',
      payload
    );
    return res.data;
  },

  /**
   * Generates refined writing suggestions for any of the 8 supported career writing sections.
   */
  async getWritingSuggestions(
    payload: WritingSuggestionRequest
  ): Promise<WritingSuggestionResponse> {
    const res = await apiClient.post<WritingSuggestionResponse>(
      '/api/career/writing/suggest',
      payload
    );
    return res.data;
  },

  /**
   * Generates a personalized career progression roadmap based on resume evidence and target role.
   */
  async generateRoadmap(
    payload: GenerateRoadmapRequest
  ): Promise<CareerRoadmapResponse> {
    const res = await apiClient.post<CareerRoadmapResponse>(
      '/api/career/roadmap/generate',
      payload
    );
    return res.data;
  },

  /**
   * Persists a personalized career roadmap to the database.
   */
  async saveRoadmap(payload: CareerRoadmapResponse): Promise<CareerRoadmapResponse> {
    const res = await apiClient.post<CareerRoadmapResponse>('/api/career/roadmap/save', payload);
    return res.data;
  },

  /**
   * Lists all roadmaps saved by the user.
   */
  async listRoadmaps(): Promise<CareerRoadmapResponse[]> {
    const res = await apiClient.get<CareerRoadmapResponse[]>('/api/career/roadmaps');
    return res.data;
  },

  /**
   * Deletes a career roadmap by ID.
   */
  async deleteRoadmap(roadmapId: string): Promise<void> {
    await apiClient.delete(`/api/career/roadmaps/${roadmapId}`);
  },

  /**
   * Compares a single resume across 2-4 target roles simultaneously.
   */
  async compareMultiRole(
    payload: MultiRoleCompareRequest
  ): Promise<MultiRoleCompareResponse> {
    const res = await apiClient.post<MultiRoleCompareResponse>(
      '/api/career/multi-role/compare',
      payload
    );
    return res.data;
  },

  /**
   * Persists a multi-role evaluation matrix.
   */
  async saveMultiRoleComparison(
    payload: MultiRoleCompareResponse
  ): Promise<MultiRoleCompareResponse> {
    const res = await apiClient.post<MultiRoleCompareResponse>(
      '/api/career/multi-role/save',
      payload
    );
    return res.data;
  },

  /**
   * Recommends portfolio projects demonstrating in-demand competencies.
   */
  async recommendProjects(
    payload: ProjectRecommendRequest
  ): Promise<ProjectRecommendResponse> {
    const res = await apiClient.post<ProjectRecommendResponse>(
      '/api/career/projects/recommend',
      payload
    );
    return res.data;
  },
};
