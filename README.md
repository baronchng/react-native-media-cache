# react-native-media-cache

Cache manager for video and image written in Typescript as a hook.

With the use of React Native Expo, FastImage is not available to managed workflow. This solution is intended to solve the lack of image caching. However, with this hook, we can even cache videos which had been an issue whether in React Native or Expo.

Files will be cached in the CacheDirectory, managed by system automatically.

This hook receipe assumes you will be using `Expo`.

## Installation

Copy source code and paste in your project.

## Dependencies

`expo-file-system`

https://docs.expo.io/versions/latest/sdk/filesystem/

```
expo install expo-file-system
```

`expo-crypto`

https://docs.expo.io/versions/latest/sdk/crypto/

```
expo install expo-crypto
```

`async-lock`

https://github.com/rogierschouten/async-lock

```
yarn add async-lock
yarn add --dev @types/async-lock
```

## Usage

#### cacheItem(url: string, options: CacheOptions = {})

Cache both remote and local file based on the url scheme.

```
const cachedUri = await cacheItem(url, {
  fileType: 'image', // works for 'video' too
  authToken: 'api-token-here',
});
```

Returns `uri` if cached successfully, else `undefined`.

#### getCache(name: string, fileType?: FileType)

Get cached item if available. Returns `undefined` or

```
{
  uri: fileInfo.uri,
  modificationTime: fileInfo.modificationTime,
  size: fileInfo.size,
};
```

#### clearCache()

Clear all caches.

```
await clearCache();
```

## Example

```
import React, { useState, useEffect } from 'react';
import { useCache } from 'react-native-media-cache';

const App = () => {
  const [imageUrl, setImageUrl] = useState<string>();
  const { cacheItem } = useCache();

  useEffect(() => {
    const prefetchImage= async () => {
      const url = `https://www.yourserver.com/api/v1/resources`;
      const cachedUri = await cacheItem(url, {
        fileType: fileAsset.content_type.startsWith('image')
          ? 'image'
          : 'video',
        authToken: 'api-token-here',
      });

      if (cachedUri) {
        setImageUrl(cachedUri);
      }
    }

    prefetchImage();
  }, []);

  return (
    <Image
      source={{
        uri: imageUrl,
        height: 96,
        width: 96,
      }}
    />
  );
}
```

## Roadmap

- Improve documentation
- Code clean up
- Component drop in usage

## License

[MIT License](https://github.com/baronchng/react-native-media-cache/blob/master/LICENSE) © Baron Ch'ng
