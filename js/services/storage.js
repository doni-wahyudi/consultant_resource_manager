/**
 * Storage Service
 * Handles file uploads to Supabase Storage
 */

const StorageService = {
    BUCKET_NAME: 'attachments',

    /**
     * Upload a file to Supabase Storage
     * @param {File} file - The file to upload
     * @param {string} folder - Folder path (e.g., 'projects/uuid' or 'reimbursements/uuid')
     * @returns {Promise<{path: string, url: string}>}
     */
    async uploadFile(file, folder) {
        const client = SupabaseService.getClient();
        if (!client) {
            throw new Error('Supabase client not available');
        }

        // Generate unique filename
        const timestamp = Date.now();
        const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        const filePath = `${folder}/${timestamp}_${safeName}`;

        const { data, error } = await client.storage
            .from(this.BUCKET_NAME)
            .upload(filePath, file, {
                cacheControl: '3600',
                upsert: false
            });

        if (error) {
            console.error('Upload error:', error);
            throw error;
        }

        // Get public URL
        const { data: urlData } = client.storage
            .from(this.BUCKET_NAME)
            .getPublicUrl(filePath);

        return {
            path: filePath,
            url: urlData.publicUrl
        };
    },

    /**
     * Delete a file from Supabase Storage
     * @param {string} path - Storage path
     */
    async deleteFile(path) {
        const client = SupabaseService.getClient();
        if (!client) return;

        const { error } = await client.storage
            .from(this.BUCKET_NAME)
            .remove([path]);

        if (error) {
            console.error('Delete error:', error);
            throw error;
        }
    },

    /**
     * Get public URL for a file
     * @param {string} path - Storage path
     * @returns {string}
     */
    getPublicUrl(path) {
        const client = SupabaseService.getClient();
        if (!client) return '';

        const { data } = client.storage
            .from(this.BUCKET_NAME)
            .getPublicUrl(path);

        return data.publicUrl;
    },

    /**
     * Save attachment metadata to database
     * @param {Object} attachment - Attachment data
     */
    async saveAttachment(attachment) {
        const client = SupabaseService.getClient();
        if (!client) {
            // Local mode - store in state
            const projects = StateManager.getState('projects') || [];
            const idx = projects.findIndex(p => p.id === attachment.project_id);
            if (idx !== -1) {
                projects[idx].attachments = projects[idx].attachments || [];
                projects[idx].attachments.push({ id: crypto.randomUUID(), ...attachment });
                StateManager.setState('projects', [...projects]);
            }
            return;
        }

        const { error } = await client
            .from('project_attachments')
            .insert([attachment]);

        if (error) throw error;
    },

    /**
     * Get attachments for a project
     * @param {string} projectId 
     * @param {string} type - 'general', 'reimbursement', or null for all
     */
    async getAttachments(projectId, type = null) {
        const client = SupabaseService.getClient();
        if (!client) {
            const projects = StateManager.getState('projects') || [];
            const project = projects.find(p => p.id === projectId);
            const attachments = project?.attachments || [];
            return type ? attachments.filter(a => a.attachment_type === type) : attachments;
        }

        let query = client
            .from('project_attachments')
            .select('*')
            .eq('project_id', projectId)
            .order('uploaded_at', { ascending: false });

        if (type) {
            query = query.eq('attachment_type', type);
        }

        const { data, error } = await query;
        if (error) throw error;
        return data || [];
    },

    /**
     * Delete attachment metadata from database
     * @param {string} attachmentId 
     */
    async deleteAttachment(attachmentId) {
        const client = SupabaseService.getClient();
        if (!client) {
            const projects = StateManager.getState('projects') || [];
            projects.forEach(p => {
                if (p.attachments) {
                    p.attachments = p.attachments.filter(a => a.id !== attachmentId);
                }
            });
            StateManager.setState('projects', [...projects]);
            return;
        }

        // Get attachment to delete file from storage
        const { data: attachment } = await client
            .from('project_attachments')
            .select('storage_path')
            .eq('id', attachmentId)
            .single();

        if (attachment?.storage_path) {
            await this.deleteFile(attachment.storage_path);
        }

        const { error } = await client
            .from('project_attachments')
            .delete()
            .eq('id', attachmentId);

        if (error) throw error;
    },

    /**
     * Format file size for display
     * @param {number} bytes 
     */
    formatFileSize(bytes) {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    },

    /**
     * Get file icon based on type
     * @param {string} fileType 
     */
    getFileIcon(fileType) {
        if (fileType?.startsWith('image/')) return '🖼️';
        if (fileType?.includes('pdf')) return '📄';
        if (fileType?.includes('zip') || fileType?.includes('rar')) return '📦';
        if (fileType?.includes('doc') || fileType?.includes('word')) return '📝';
        if (fileType?.includes('xls') || fileType?.includes('sheet')) return '📊';
        return '📎';
    }
};
