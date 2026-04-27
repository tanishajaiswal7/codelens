import PropTypes from 'prop-types';
import './FileTree.css';

/**
 * FileTree Component
 * Displays folder/file tree for repository browsing
 */
export default function FileTree({
  items,
  currentPath,
  onFolderClick,
  onFileClick,
  isLoading,
}) {
  // Parse current path into breadcrumb segments
  const breadcrumbs = currentPath
    ? currentPath.split('/').filter((seg) => seg)
    : [];

  // Check if file extension is supported for review
  const isSupportedFile = (filename) => {
    const supportedExts = [
      '.js',
      '.jsx',
      '.ts',
      '.tsx',
      '.py',
      '.java',
      '.go',
      '.rs',
      '.cpp',
      '.c',
      '.cs',
      '.php',
      '.rb',
      '.swift',
      '.kt',
      '.vue',
      '.html',
      '.css',
      '.sql',
      '.sh',
      '.yaml',
      '.yml',
      '.json',
      '.md',
    ];
    const ext = filename.toLowerCase().substring(filename.lastIndexOf('.'));
    return supportedExts.includes(ext);
  };

  // Get file icon based on extension
  const getFileIcon = (filename) => {
    const ext = filename.toLowerCase().substring(filename.lastIndexOf('.'));
    if (ext === '.js' || ext === '.jsx') return '⚡';
    if (ext === '.ts' || ext === '.tsx') return '🔷';
    if (ext === '.py') return '🐍';
    if (ext === '.java') return '☕';
    if (ext === '.go') return '🐹';
    if (ext === '.rs') return '🦀';
    if (ext === '.html') return '🌐';
    if (ext === '.css') return '🎨';
    if (ext === '.json') return '📋';
    if (ext === '.md') return '📝';
    return '📄';
  };

  // Format file size
  const formatSize = (bytes) => {
    if (!bytes) return '';
    if (bytes > 1024) {
      return `${(bytes / 1024).toFixed(1)}KB`;
    }
    return `${bytes}B`;
  };

  return (
    <div className="file-tree">
      {/* Breadcrumb */}
      <div className="breadcrumb">
        <button className="breadcrumb-root" onClick={() => onFolderClick('')}>
          root
        </button>
        {breadcrumbs.map((segment, idx) => {
          const path = breadcrumbs.slice(0, idx + 1).join('/');
          return (
            <span key={path}>
              <span className="breadcrumb-sep">/</span>
              <button
                className="breadcrumb-segment"
                onClick={() => onFolderClick(path)}
              >
                {segment}
              </button>
            </span>
          );
        })}
      </div>

      {/* File/Folder List */}
      <div className="fileList">
        {isLoading ? (
          // Skeleton loading state
          <>
            {[...Array(5)].map((_, i) => (
              <div key={`skeleton-${i}`} className="fileSkeleton">
                <div className="skeletonIcon"></div>
                <div className="skeletonName"></div>
              </div>
            ))}
          </>
        ) : items && items.length > 0 ? (
          items.map((item) => {
            const isSupported = item.type === 'dir' || isSupportedFile(item.name);
            const isUnsupported = item.type === 'file' && !isSupported;

            return (
              <div
                key={item.path}
                className={`fileItem ${isUnsupported ? 'unsupported' : ''}`}
                title={isUnsupported ? 'This file type cannot be reviewed' : ''}
              >
                {item.type === 'dir' ? (
                  <>
                    <span className="fileIcon">📁</span>
                    <span className="fileName">{item.name}</span>
                    <button
                      className="folderButton"
                      onClick={() => onFolderClick(item.path)}
                    >
                      <span className="chevron">▶</span>
                    </button>
                  </>
                ) : (
                  <>
                    <span className="fileIcon">{getFileIcon(item.name)}</span>
                    <span className="fileName">{item.name}</span>
                    {item.size && (
                      <span className="fileSize">{formatSize(item.size)}</span>
                    )}
                    <button
                      className="fileButton"
                      onClick={() => !isUnsupported && onFileClick(item)}
                      disabled={isUnsupported}
                    >
                      ▶
                    </button>
                  </>
                )}
              </div>
            );
          })
        ) : (
          <div className="emptyState">No files or folders found</div>
        )}
      </div>
    </div>
  );
}

FileTree.propTypes = {
  items: PropTypes.arrayOf(
    PropTypes.shape({
      name: PropTypes.string.isRequired,
      path: PropTypes.string.isRequired,
      type: PropTypes.oneOf(['file', 'dir']).isRequired,
      size: PropTypes.number,
    })
  ),
  currentPath: PropTypes.string.isRequired,
  onFolderClick: PropTypes.func.isRequired,
  onFileClick: PropTypes.func.isRequired,
  isLoading: PropTypes.bool.isRequired,
};
