# Indico Proxy Client (JS)

This project is a client-library for using Indico Proxy. It supports these features:

- Authentication
- Verifying connection/credentioals
- Chunked Uploads using extended TUS-protocol
- Resume uploads
- Checking status on single and multiple uploads
- Announcing progress on uploads
- Verification of uploads, using both SHA, and Proxy's alternative Verification.
- Fingerprinting uploads
- Submitting extended Metadata
- Retrieving forms (experimental api)

> The project currently only works in **NODE**, but getting it to work with the browser should be doable

## Usage

```typescript

// 1. Create the client
const client = new ProxyClient(url, {
      authorization: { authorization: 'Basic/Bearer ...' },
    })
// 2. Verifies that the connection is valid
const result = await client.checkConnection()

// 3. Creates one or more uploads, with their metadata
const testFile = '/path/to/file' 
 const result = await client.createMulti({
      multiId: 'multi-abc',
      uploads: [
        {
          // Most metadata is optional, and Proxy will pick up lots of information from formfields
          // with its mapping functionality.
          // If in doubt, use FormFields.
          // The metadata here is typed, and should give the developer the flexibility to map any data.
          caseNumber: '12345678',
          userId: 'abc123',
          clientMediaId: '123',
          fileType: file.mime,
          capturedAt: mockDate,
          filePath: testFile,
          // Filesize should match the file 
          fileSize: 2000,
          displayName: 'Title',
          equipmentId: 'test',
          creator: {},
          parent: {
            batchId: '123',
            name: 'abc',
          },
          formFields: [
            // Formfields require the 'value'-property to be set, but must also provide at least on of
            // - key
            // - fieldId
            // - translationKey
            // - visualName
            // This gives Proxy enough information to do its mapping.
            // If you have more than one of these fields available, it is recommended to provide all of them
            {
              key: 'CaseNumber',
              value: '12345678'
            },
            {
              fieldId: "cslkfj#*$&sdlfk',
              value: 'foo'
            }
          ]
        },
      ],
    })

// Each upload returned has their own unique uplaod-url which should be used for uploads.
const f = result.Files[0]
// 4. Attach an uploader to the Location (url) for the file.
const upload = await client.fromUploadUrl(f.Location)
// 5. Upload the file (test), optionally providing a chunk-size.
await upload.uploadFile(testFile, { chunkSize: 20 * MegaByte })
// 6. Verify that the upload did complete
await upload.verifyUpload()

// If you need to resume the upload, you should be able to do so by starting from step 4.
```

