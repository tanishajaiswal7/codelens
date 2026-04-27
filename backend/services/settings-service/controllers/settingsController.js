import { settingsService } from '../services/settingsService.js';

export const settingsController = {
  async getSettings(req, res) {
    try {
      const userId = req.userId;
      const settings = await settingsService.getSettings(userId);

      res.json({
        message: 'Settings retrieved',
        settings,
      });
    } catch (error) {
      console.error('Get settings controller error:', error.message);
      res.status(500).json({
        message: 'Failed to retrieve settings',
        error: error.message,
      });
    }
  },

  async updateSettings(req, res) {
    try {
      const userId = req.userId;
      const { theme, defaultPersona, preferredLanguage, emailNotifications, accountEmail } = req.body;

      const updateData = {};
      if (theme) updateData.theme = theme;
      if (defaultPersona) updateData.defaultPersona = defaultPersona;
      if (preferredLanguage) updateData.preferredLanguage = preferredLanguage;
      if (emailNotifications) updateData.emailNotifications = emailNotifications;
      if (accountEmail) updateData.accountEmail = accountEmail;

      const settings = await settingsService.updateSettings(userId, updateData);

      res.json({
        message: 'Settings updated',
        settings,
      });
    } catch (error) {
      console.error('Update settings controller error:', error.message);
      res.status(500).json({
        message: 'Failed to update settings',
        error: error.message,
      });
    }
  },
};
