import crypto from 'crypto';
import axios from 'axios';
import { User } from '../../auth-service/models/User.js';

/**
 * GitHub Authentication Service
 * Handles OAuth flow, PAT validation, and token encryption/decryption
 */

const ALGORITHM = 'aes-256-cbc';

/**
 * Gets the encryption key from environment
 * @returns {string} - Encryption key
 * @throws {Error} If key is not configured
 */
const getEncryptionKey = () => {
  const key = process.env.GITHUB_TOKEN_ENCRYPTION_KEY;
  if (!key || key.length < 32) {
    throw new Error('GITHUB_TOKEN_ENCRYPTION_KEY is not configured or too short (minimum 32 characters)');
  }
  return key;
};

/**
 * Encrypts a token using AES-256-CBC
 * @param {string} token - The token to encrypt
 * @returns {string} - Encrypted token in hex format
 * @throws {Error} If encryption fails
 */
export const encryptToken = (token) => {
  try {
    const ENCRYPTION_KEY = getEncryptionKey();
    const keyBuffer = Buffer.from(ENCRYPTION_KEY.substring(0, 32).padEnd(32, '0'), 'utf8');
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ALGORITHM, keyBuffer, iv);
    
    let encrypted = cipher.update(token, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    // Return iv + encrypted as a single string for storage
    return iv.toString('hex') + ':' + encrypted;
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Encryption error:', error.message);
    }
    throw new Error('Failed to encrypt token');
  }
};

/**
 * Decrypts a token using AES-256-CBC
 * @param {string} encryptedToken - The encrypted token (iv:encrypted format)
 * @returns {string} - Decrypted token
 * @throws {Error} If decryption fails
 */
export const decryptToken = (encryptedToken) => {
  try {
    const ENCRYPTION_KEY = getEncryptionKey();
    const keyBuffer = Buffer.from(ENCRYPTION_KEY.substring(0, 32).padEnd(32, '0'), 'utf8');
    const [ivHex, encrypted] = encryptedToken.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, keyBuffer, iv);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Decryption error:', error.message);
    }
    throw new Error('Failed to decrypt token');
  }
};

/**
 * Exchanges OAuth code for access token
 * @param {string} code - Authorization code from GitHub
 * @returns {Promise<string>} - Access token
 * @throws {Error} If token exchange fails
 */
export const exchangeCodeForToken = async (code) => {
  try {
    const response = await axios.post(
      'https://github.com/login/oauth/access_token',
      {
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code,
      },
      {
        headers: { Accept: 'application/json' },
      }
    );

    if (response.data.error) {
      throw new Error(response.data.error_description || 'Failed to exchange code for token');
    }

    return response.data.access_token;
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Token exchange error:', error.message);
    }
    throw new Error('Failed to exchange authorization code for token');
  }
};

/**
 * Fetches GitHub user info using access token
 * @param {string} accessToken - GitHub access token
 * @returns {Promise<Object>} - GitHub user object { id, login, name, email, avatar_url }
 * @throws {Error} If API call fails
 */
export const fetchGitHubUser = async (accessToken) => {
  try {
    const response = await axios.get('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/vnd.github.v3+json',
      },
    });

    return response.data;
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('GitHub user fetch error:', error.message);
    }
    if (error.response?.status === 401) {
      throw new Error('Invalid or expired GitHub token');
    }
    throw new Error('Failed to fetch GitHub user information');
  }
};

/**
 * Validates PAT and stores it encrypted in the user's record
 * @param {string} userId - User ID from MongoDB
 * @param {string} pat - Personal Access Token to validate
 * @returns {Promise<Object>} - { success: true, githubUsername, githubAvatar }
 * @throws {Error} If validation fails
 */
export const validateAndStorePAT = async (userId, pat) => {
  try {
    // Validate token by fetching user info
    const ghUser = await fetchGitHubUser(pat);

    // Encrypt and store token
    const encryptedToken = encryptToken(pat);
    
    const user = await User.findByIdAndUpdate(
      userId,
      {
        githubToken: encryptedToken,
        githubId: ghUser.id.toString(),
        githubUsername: ghUser.login,
        githubAvatar: ghUser.avatar_url,
      },
      { new: true }
    );

    return {
      success: true,
      githubUsername: user.githubUsername,
      githubAvatar: user.githubAvatar,
    };
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('PAT validation error:', error.message);
    }
    throw new Error(error.message || 'Invalid token — check scopes and try again');
  }
};

/**
 * Gets a decrypted GitHub token for a user
 * Used by other services to get the token for API calls
 * @param {string} userId - User ID from MongoDB
 * @returns {Promise<string>} - Decrypted access token
 * @throws {Error} If user not found or token not available
 */
export const getDecryptedToken = async (userId) => {
  try {
    const user = await User.findById(userId);
    
    if (!user || !user.githubToken) {
      throw new Error('GitHub not connected');
    }

    return decryptToken(user.githubToken);
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Get decrypted token error:', error.message);
    }
    throw error;
  }
};

/**
 * Handles OAuth callback: creates or updates user with GitHub account
 * @param {string} code - Authorization code from GitHub
 * @returns {Promise<Object>} - { user, newUser: boolean }
 * @throws {Error} If OAuth flow fails
 */
export const handleOAuthCallback = async (code) => {
  try {
    const accessToken = await exchangeCodeForToken(code);
    const ghUser = await fetchGitHubUser(accessToken);
    const encryptedToken = encryptToken(accessToken);

    // First try to find by email if available
    let user = ghUser.email ? await User.findOne({ email: ghUser.email }) : null;

    // If no email or not found, try to find by GitHub ID
    if (!user && ghUser.id) {
      user = await User.findOne({ githubId: ghUser.id.toString() });
    }

    if (user) {
      // Update existing user with GitHub info
      user.githubToken = encryptedToken;
      user.githubId = ghUser.id.toString();
      user.githubUsername = ghUser.login;
      user.githubAvatar = ghUser.avatar_url;
      await user.save();
      return { user, newUser: false };
    } else {
      // Create new user from GitHub
      // Use GitHub email if available, otherwise create unique email based on GitHub ID
      const email = ghUser.email || `gh-${ghUser.id}@github.local`;
      
      user = new User({
        name: ghUser.name || ghUser.login,
        email: email,
        password: null,
        githubToken: encryptedToken,
        githubId: ghUser.id.toString(),
        githubUsername: ghUser.login,
        githubAvatar: ghUser.avatar_url,
      });
      await user.save();
      return { user, newUser: true };
    }
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('OAuth callback error:', error.message);
    }
    throw error;
  }
};

/**
 * Disconnects GitHub account from user
 * @param {string} userId - User ID from MongoDB
 * @returns {Promise<Object>} - { success: true }
 * @throws {Error} If update fails
 */
export const disconnectGitHub = async (userId) => {
  try {
    await User.findByIdAndUpdate(userId, {
      githubToken: null,
      githubId: null,
      githubUsername: null,
      githubAvatar: null,
    });
    return { success: true };
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Disconnect error:', error.message);
    }
    throw new Error('Failed to disconnect GitHub account');
  }
};
