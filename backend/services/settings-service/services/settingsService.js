import { Settings } from '../models/Settings.js';
import { User } from '../../auth-service/models/User.js';

export const settingsService = {
  async getSettings(userId) {
    try {
      let settings = await Settings.findOne({ userId });

      // Create default settings if not found
      if (!settings) {
        settings = await Settings.create({
          userId,
          theme: 'dark',
          defaultPersona: 'faang',
          preferredLanguage: 'javascript',
          emailNotifications: {
            enabled: false,
            frequency: 'daily',
          },
        });
      }

      return settings;
    } catch (error) {
      console.error('Get settings error:', error);
      throw error;
    }
  },

  async updateSettings(userId, updateData) {
    try {
      const settings = await Settings.findOneAndUpdate(
        { userId },
        updateData,
        { new: true, upsert: true }
      );

      return settings;
    } catch (error) {
      console.error('Update settings error:', error);
      throw error;
    }
  },

  async updateTheme(userId, theme) {
    try {
      const settings = await Settings.findOneAndUpdate(
        { userId },
        { theme },
        { new: true, upsert: true }
      );

      return settings;
    } catch (error) {
      console.error('Update theme error:', error);
      throw error;
    }
  },

  async updateDefaultPersona(userId, defaultPersona) {
    try {
      const settings = await Settings.findOneAndUpdate(
        { userId },
        { defaultPersona },
        { new: true, upsert: true }
      );

      return settings;
    } catch (error) {
      console.error('Update persona error:', error);
      throw error;
    }
  },

  async updateLanguagePreference(userId, preferredLanguage) {
    try {
      const settings = await Settings.findOneAndUpdate(
        { userId },
        { preferredLanguage },
        { new: true, upsert: true }
      );

      return settings;
    } catch (error) {
      console.error('Update language error:', error);
      throw error;
    }
  },

  async updateEmailNotifications(userId, emailNotifications) {
    try {
      const settings = await Settings.findOneAndUpdate(
        { userId },
        { emailNotifications },
        { new: true, upsert: true }
      );

      return settings;
    } catch (error) {
      console.error('Update notifications error:', error);
      throw error;
    }
  },

  async updateAccountEmail(userId, accountEmail) {
    try {
      const settings = await Settings.findOneAndUpdate(
        { userId },
        { accountEmail },
        { new: true, upsert: true }
      );

      return settings;
    } catch (error) {
      console.error('Update account email error:', error);
      throw error;
    }
  },
};
