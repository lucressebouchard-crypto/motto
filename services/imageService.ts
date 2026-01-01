import { supabase } from '../lib/supabase';

const STORAGE_BUCKET = 'listing-images';

/**
 * Service pour gérer l'upload et la suppression d'images avec Supabase Storage
 */
export const imageService = {
  /**
   * Upload une image dans Supabase Storage
   * @param file - Le fichier image à uploader
   * @param userId - L'ID de l'utilisateur propriétaire
   * @returns L'URL publique de l'image uploadée
   */
  async uploadImage(file: File, userId: string): Promise<string> {
    // Vérifier que l'utilisateur est authentifié
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error('Erreur lors de la récupération de la session:', sessionError);
      throw new Error('Erreur d\'authentification. Veuillez vous reconnecter.');
    }
    
    if (!session) {
      console.error('Aucune session trouvée pour l\'utilisateur');
      throw new Error('Vous devez être connecté pour uploader des images');
    }

    console.log('📤 Upload image:', {
      userId,
      sessionUserId: session.user?.id,
      bucket: STORAGE_BUCKET,
      fileName: file.name,
    });

    // Générer un nom de fichier unique
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

    // Upload le fichier
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      console.error('❌ Erreur lors de l\'upload:', error);
      console.error('Détails de l\'erreur:', {
        message: error.message,
        statusCode: error.statusCode,
        error: error.error,
        statusText: error.statusText,
        userId,
        sessionUserId: session.user?.id,
        bucket: STORAGE_BUCKET,
        fileName,
      });
      
      // Messages d'erreur plus clairs
      if (error.message.includes('Bucket not found') || error.message.includes('does not exist') || error.statusCode === 404) {
        throw new Error(`Le bucket "${STORAGE_BUCKET}" n'existe pas dans Supabase. Créez-le dans Supabase Dashboard > Storage > New bucket (nom: listing-images, public: oui)`);
      } else if (
        error.message.includes('new row violates row-level security') || 
        error.message.includes('RLS') ||
        error.message.includes('permission') ||
        error.message.includes('policy') ||
        error.statusCode === 403
      ) {
        const detailedError = `Vous n'avez pas la permission d'uploader des images. \n\nErreur: ${error.message}\n\nVérifiez que:\n1. Vous êtes bien connecté\n2. Les politiques RLS sont configurées (exécutez: npm run supabase:fix-storage-rls)\n3. Le bucket est public`;
        throw new Error(detailedError);
      } else {
        throw new Error(`Erreur lors de l'upload de l'image: ${error.message}`);
      }
    }

    console.log('✅ Image uploadée avec succès:', data.path);

    // Récupérer l'URL publique
    const { data: { publicUrl } } = supabase.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(data.path);

    return publicUrl;
  },

  /**
   * Upload plusieurs images
   * @param files - Les fichiers images à uploader
   * @param userId - L'ID de l'utilisateur propriétaire
   * @returns Un tableau d'URLs publiques
   */
  async uploadMultipleImages(files: File[], userId: string): Promise<string[]> {
    const uploadPromises = files.map(file => this.uploadImage(file, userId));
    return Promise.all(uploadPromises);
  },

  /**
   * Supprime une image de Supabase Storage
   * @param imageUrl - L'URL de l'image à supprimer
   */
  async deleteImage(imageUrl: string): Promise<void> {
    try {
      // Extraire le chemin du fichier depuis l'URL
      const urlParts = imageUrl.split('/');
      const filePath = urlParts.slice(-2).join('/'); // userId/filename

      const { error } = await supabase.storage
        .from(STORAGE_BUCKET)
        .remove([filePath]);

      if (error) {
        console.error('Erreur lors de la suppression:', error);
        // Ne pas throw pour éviter de bloquer si l'image n'existe plus
        console.warn('Impossible de supprimer l\'image, elle peut ne plus exister');
      }
    } catch (error) {
      console.error('Erreur lors de la suppression de l\'image:', error);
      // Ne pas throw pour éviter de bloquer
    }
  },

  /**
   * Supprime plusieurs images
   * @param imageUrls - Les URLs des images à supprimer
   */
  async deleteMultipleImages(imageUrls: string[]): Promise<void> {
    const deletePromises = imageUrls.map(url => this.deleteImage(url));
    await Promise.allSettled(deletePromises); // Utiliser allSettled pour ne pas échouer si une image est déjà supprimée
  },

  /**
   * Valide qu'un fichier est une image
   */
  validateImageFile(file: File): { valid: boolean; error?: string } {
    const maxSize = 5 * 1024 * 1024; // 5MB
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

    if (!allowedTypes.includes(file.type)) {
      return {
        valid: false,
        error: 'Le fichier doit être une image (JPEG, PNG ou WebP)',
      };
    }

    if (file.size > maxSize) {
      return {
        valid: false,
        error: 'L\'image ne doit pas dépasser 5MB',
      };
    }

    return { valid: true };
  },
};

