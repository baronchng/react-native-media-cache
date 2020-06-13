import { useEffect } from "react";
import * as FileSystem from "expo-file-system";
import * as Crypto from "expo-crypto";
import { Linking } from "expo";
import AsyncLock from "async-lock";

type FileType = "image" | "video";
const lock = new AsyncLock();

export type CacheOptions = {
  /**
   * If this is set, this name will be hashed as filename instead of the url.
   */
  customName?: string;

  /**
   * If provided, this will be used to determine file extension, else no extension will be set to filename.
   */
  fileType?: FileType;

  /**
   * This auth token or api token is used to access restricted remote resources.
   */
  authToken?: string;
};

function APIHeader(token?: string) {
  const header: any = {
    Accept: "application/json",
    "Content-Type": "application/json",
  };

  if (token) {
    header.Authorization = `Bearer ${token}`;
  }
  return header;
}

export const useCache = () => {
  const cacheDirName = "cache";

  useEffect(() => {
    const init = async () => {
      try {
        if (!(await _isCacheDirectoryExists())) {
          await _createCacheDirectory();
        }
      } catch (e) {
        console.log(e);
      }
    };

    init();
  }, []);

  /**
   * Check if cache directory already exists.
   */
  const _isCacheDirectoryExists = async () => {
    const cacheDir = await FileSystem.getInfoAsync(
      FileSystem.cacheDirectory + cacheDirName
    );
    return cacheDir.isDirectory && cacheDir.exists;
  };

  /**
   * Create cache directory.
   */
  const _createCacheDirectory = async () => {
    return FileSystem.makeDirectoryAsync(
      FileSystem.cacheDirectory + cacheDirName
    );
  };

  /**
   * Construct the filename.
   * @param url File url.
   * @param fileType Image or video.
   */
  const _getFilename = async (url: string, fileType?: FileType) => {
    const digestUrl = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      url
    );
    if (fileType) {
      const fileExt = fileType === "image" ? "jpg" : "mp4";
      return `${digestUrl}.${fileExt}`;
    } else {
      return digestUrl;
    }
  };

  /**
   * Check whether the url is a remote resource or a local file.
   * @param url File url.
   */
  const _isRemoteUrl = (url: string) => {
    const parsedUrl = Linking.parse(url);
    return parsedUrl.scheme === "http" || parsedUrl.scheme === "https";
  };

  /**
   * Caches remote URL resource.
   * @param url Remote URL. The url given will be hashed and used as filename.
   * @param options Additional options including how to store the cache and some other configurations.
   */
  const _cacheRemoteItem = async (url: string, options: CacheOptions = {}) => {
    const { customName, authToken, fileType } = options;
    const filename = await _getFilename(customName ?? url, fileType);

    // acquire lock here to prevent multiple redundant downloads
    return await lock
      .acquire(url, async () => {
        const existingCache = await getCache(url, fileType);
        if (!existingCache) {
          const downloadResumable = FileSystem.createDownloadResumable(
            url,
            FileSystem.cacheDirectory + `${cacheDirName}/` + filename,
            { headers: APIHeader(authToken), cache: true }
          );
          const result = await downloadResumable.downloadAsync();

          if (result) {
            console.log(`File downloaded and cached for ${url}`);
            return result.uri;
          } else {
            console.log(`Unable to download and cache ${url}`);
            return undefined;
          }
        } else {
          return undefined;
        }
      })
      .catch((err) => {
        console.log(err);
        return undefined;
      });
  };

  /**
   * Caches local URL resource.
   * @param url Local URL. The url given will be hashed and used as filename.
   * @param options Additional options including how to store the cache and some other configurations.
   */
  const _cacheLocalItem = async (url: string, options: CacheOptions = {}) => {
    const { customName, fileType } = options;
    const filename = await _getFilename(customName ?? url, fileType);

    // copy instead of move because move is restricted
    await FileSystem.copyAsync({
      from: url,
      to: FileSystem.cacheDirectory + `${cacheDirName}/` + filename,
    });

    // get the file info
    const result = await getCache(
      FileSystem.cacheDirectory + `${cacheDirName}/` + filename,
      fileType
    );
    if (result) {
      console.log(`File cached for ${url}`);
      return result.uri;
    } else {
      console.log(`Unable to cache ${url}`);
      return undefined;
    }
  };

  /**
   * Caches remote or local URL resource. Automatically determined based on url scheme.
   * @param url File URL. The url given will be hashed and used as filename.
   * @param options Additional options including how to store the cache and some other configurations.
   */
  const cacheItem = async (url: string, options: CacheOptions = {}) => {
    const { fileType } = options;
    try {
      // search if cache available
      const existingCache = await getCache(url, fileType);
      if (existingCache) {
        // cache hit, return the uri
        return existingCache.uri;
      }

      if (_isRemoteUrl(url)) {
        return _cacheRemoteItem(url, options);
      } else {
        return _cacheLocalItem(url, options);
      }
    } catch (e) {
      console.error(e);
      return undefined;
    }
  };

  /**
   * Get cached entry. Returns undefined if no such cache is found.
   * @param name Url or customName set when doing cacheItem().
   * @param fileType If provided, this will be used to determine file extension, else no extension will be set to filename.
   */
  const getCache = async (name: string, fileType?: FileType) => {
    const filename = await _getFilename(name, fileType);
    const fileInfo = await FileSystem.getInfoAsync(
      FileSystem.cacheDirectory + `${cacheDirName}/` + filename
    );
    if (fileInfo.exists) {
      console.log(
        `[Cache Hit] ${fileType ? `type: ${fileType}, ` : ""}url/name: ${name}`
      );
      return {
        uri: fileInfo.uri,
        modificationTime: fileInfo.modificationTime,
        size: fileInfo.size,
      };
    }
    return undefined;
  };

  /**
   * Clear all cache.
   */
  const clearCache = async () => {
    await FileSystem.deleteAsync(FileSystem.cacheDirectory + cacheDirName);
  };

  return { cacheItem, getCache, clearCache };
};
