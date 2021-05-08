export interface ProxyFeatures {
  Search: Search
  Validation: Validation
  RequiredFields: string[]
}

export interface Search {
  CaseID: boolean
  CaseName: boolean
}

export interface Validation {}

export interface MultiResult {
  MultiID: string
  Files: ProxyFile[]
  Messages: Message[]
}

export interface PapiForm {
  __typename?: string
  at?: string
  form?: Form
  formType?: FormType
  icon?: string
  order?: number
  style?: string
}

export interface Form {
  __typename?: string
  allowIncomplete?: boolean
  fields?: Field[]
  id?: string
}

export interface Field {
  __typename?: string
  description?: DisplayName
  editable?: boolean
  features?: string[]
  id?: string
  inputHint?: string
  listValues?: ListValue[]
  max?: number
  maxCount?: number
  min?: number
  minCount?: number
  pattern?: string
  personCategories?: PersonCategory[]
  placeholder?: DisplayName
  required?: boolean
  step?: number
  subForm?: string
  title?: DisplayName
  type?: string
  valueType?: string
  viewPriority?: string
}

export interface DisplayName {
  en?: string
  'nb-NO'?: string
}

export interface ListValue {
  __typename?: string
  defaultSelected?: boolean
  displayName?: DisplayName
  id?: string
  value?: string
}

export interface PersonCategory {
  __typename?: string
  key?: string
  localizations?: Localization[]
}

export interface Localization {
  __typename?: string
  language?: string
  value?: string
}

export interface FormType {
  __typename?: string
  displayName?: DisplayName
}

export interface ValidateResponse {
  CaseID?: Case
  CaseName?: Case
  GroupID?: Group
  GroupName?: Group
  ParentID?: Parent
  ParentName?: Parent
  Sid?: Sid
  UserID?: Sid
  UserName?: Sid
}

export interface Case {
  Details?: Detail[]
  Error?: Error
  ID?: ID
  Name?: ID
  Private?: boolean
  Sensitive?: boolean
  Subtitle?: ID
  Title?: ID
}

export interface Detail {
  Key?: ID
  RawKey?: ID
  RawValue?: ID
  Value?: ID
}

export enum ID {
  String = 'string',
}

export interface Error {
  Details?: Detail[]
  Status?: ID
  StatusCode?: number
  Subtitle?: ID
  Title?: ID
}

export interface Group {
  Error?: Error
  Gid?: ID
  ID?: ID
  Name?: ID
}

export interface Parent {
  Error?: Error
  ID?: ID
}

export interface Sid {
  AuthID?: ID
  Error?: Error
  ID?: ID
  UserName?: ID
}

export type CreateMultiResult = MultiResult & {
  Files: Array<ProxyFile & { filePath: string }>
}
export interface ProxyFile {
  Location: string
  FileSize: number
  ParentId: string
  ClientId: string
  ServerChecksum: string
  ShaSumMatch?: boolean
  LocalChecksums: Checksum[]
  ExternalCompleted: boolean
  UploadId: string
  'Upload-Length': number
  'Upload-Offset': number
}

interface Message {
  Kind: string
  Message: string
}

export interface MultiUpload {
  multiId: string
  uploads: Array<UploadMetadata & { filePath: string }>
}

export interface Parent {
  batchId: string
  name: string
}

export interface IProxyError {
  type: string
  title: string
  status: number
  detail: string
  instance: string
}

export class ProxyError extends Error {
  public type: string
  public status: number
  public detail: string
  public instance: string
  public date: Date
  constructor(err: IProxyError) {
    super(err.title)
    this.name = 'ProxyError'
    this.type = err.type
    this.status = err.status
    this.detail = err.detail
    this.instance = err.instance
    this.date = new Date()
  }
}

export interface ValidatePayload {
  // Used to identify on behalf of a user
  As: As
  // Validate if a CaseID (CaseNumber) is valid, and accessable for user
  CaseID?: string
  // Validate if a CaseName (CaseTitle) is valid, and accessable for user
  CaseName?: string
  // Validate if a GroupId is valid, and accessable for user
  GroupID?: string
  // Validate if a GroupId is valid, and accessable for user
  GroupName?: string
  // Validate if a GroupName is valid, and accessable for user
  ParentID?: string
  // Validate if a Parent ID (like Album/Report-name) is valid, and accessable for user
  ParentName?: string
  // Validate if a Parent Name (like Album/Report-name) is valid, and accessable for user
  Sid?: string
  // Validate if a Active Directory-SID is valid, and accessable for user
  UserID?: string
  // Validate if a UserName is valid, and accessable for user
  UserName?: string
}

export interface As {
  ApiKey?: string
  ClientId?: string
  UserId?: string
  UserName?: string
  UserSid?: string
}

// Generated 2020-06-11 from https://github.com/IndicoSystems/Proxy-common/blob/master/metadata/types.go

/**
 *  Data-format for Proxy
 *
 * See https://github.com/IndicoSystems/Proxy-common/blob/master/metadata/types.go
 * **/

export interface UploadMetadata {
  userId?: string
  adSid?: string
  adLogin?: string
  parent: Partial<Parent>
  createdAt?: Date
  updatedAt?: Date
  archiveAt?: Date
  completedAt?: Date
  capturedAt: Date
  fileType: string
  fileSize: number
  displayName?: string
  description?: string
  checksum?: Checksum[]
  fileName?: string
  tags?: string[]
  extId?: string
  caseNumber?: string
  duration?: number
  creator: Partial<Creator>
  location?: Location
  subject?: Subject[]
  equipmentId: string
  interviewType?: string
  bookmarks?: Bookmark[]
  annotations?: Annotation[]
  notes?: string
  clientMediaId: string
  groupId?: string
  groupName?: string
  formFields?: FormField[]
  transcription?: Transcription[]
}

export interface Parent {
  id: string
  batchId: string
  name: string
  description: string
  createdAt: string
  updatedAt: string
}

export interface Checksum {
  value: string
  checksumType: string
}

export interface Creator {
  sysId: string
  Attributes: Attributes
  firstName: string
  lastName: string
  id: string
  dob: string
  gender: string
  nationality: string
  workplace: string
  status: string
  workPhone: string
  phone: string
  mobile: string
  isPresent: boolean
  text: string
  latitude: number
  longitude: number
  address: string
  address2: string
  zipCode: string
  postArea: string
  country: string
  accuracy: number
  altitude: number
}

export interface Attributes {
  'any-string': string
}

export interface Location {
  text: string
  latitude: number
  longitude: number
  address: string
  address2: string
  zipCode: string
  postArea: string
  country: string
  accuracy: number
  altitude: number
}

export interface Subject {
  firstName: string
  lastName: string
  id: string
  dob: string
  gender: string
  nationality: string
  workplace: string
  status: string
  workPhone: string
  phone: string
  mobile: string
  isPresent: boolean
  text: string
  latitude: number
  longitude: number
  address: string
  address2: string
  zipCode: string
  postArea: string
  country: string
  accuracy: number
  altitude: number
}

export interface Bookmark {
  creationTime: string
  id: string
  title: string
  startPosition: number
  endPosition: number
}

export interface Annotation {
  createdAt: string
  id: string
  title: string
  type: string
  data: Data
  x1: number
  x2: number
  y1: number
  y2: number
  startPosition: number
  endPosition: number
}

export interface Data {
  censorType: string
}

export type FormField = {
  value: string
  required?: boolean
  dataType?: string
  validationRule?: ValidationRule
} & RequireAtLeastOne<formfield>

type RequireAtLeastOne<T, Keys extends keyof T = keyof T> = Pick<
  T,
  Exclude<keyof T, Keys>
> &
  {
    [K in Keys]-?: Required<Pick<T, K>> & Partial<Pick<T, Exclude<Keys, K>>>
  }[Keys]

interface formfield {
  fieldId: string
  translationKey: string
  visualName: string
  key: string
}

export interface ValidationRule {
  min: number
  max: number
}

export interface Transcription {
  type: string
  person: Person
  eventKind: string
  source: string
  text: string
  startPosition: number
  endPosition: number
}

export interface Person {
  firstName: string
  lastName: string
  id: string
  dob?: string
  gender: string
  nationality: string
  workplace: string
  status: string
  workPhone: string
  phone: string
  mobile: string
  isPresent: boolean
  text: string
  latitude: number
  longitude: number
  address: string
  address2: string
  zipCode: string
  postArea: string
  country: string
  accuracy: number
  altitude: number
}

export type Announcer = (file: ProxyFile, progress: IProgress) => any
type IProgress = {
  offset: number
  current: number
  total: number
  fraction: number
}
