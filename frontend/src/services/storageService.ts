import apiClient from '@/lib/axios';

export interface StoredFileResponse {
  id: string;
  original_filename: string;
  mime_type: string;
  file_size: number;
  purpose: string;
  created_at: string;
}

export const storageService = {
  /**
   * Securely uploads a file to private storage.
   */
  async uploadFile(file: File, purpose: string = 'linkedin_pdf'): Promise<StoredFileResponse> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('purpose', purpose);

    const res = await apiClient.post<StoredFileResponse>('/api/files/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return res.data;
  },

  /**
   * Downloads a private file by streaming its content and triggering browser download.
   */
  async downloadFile(fileId: string, filename?: string): Promise<void> {
    const res = await apiClient.get<Blob>(`/api/files/${fileId}/download`, {
      responseType: 'blob',
    });

    const blobUrl = window.URL.createObjectURL(res.data);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.setAttribute('download', filename || 'document.pdf');
    document.body.appendChild(link);
    link.click();
    link.parentNode?.removeChild(link);
    window.URL.revokeObjectURL(blobUrl);
  },

  /**
   * Deletes a file from storage.
   */
  async deleteFile(fileId: string): Promise<void> {
    await apiClient.delete(`/api/files/${fileId}`);
  },
};
