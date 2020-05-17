// import AWS from "aws-sdk"

import {
  CreateUserResponse,
  DeleteUserResponse,
  GetUserResponse,
  UpdateUserResponse
} from "./Responses"
import {UserModel} from "../../models/UserModel"
import {DynamoDBImpl} from "./Impl/DynamoDBImpl"
import {TypeORMImpl} from "./Impl/TypeORMImpl"
import {VerificationModel} from "../../models/VerificationModel"
import {PasswordResetModel} from "../../models/PasswordResetModel"

export interface DatabaseImpl {
  createUser(user: UserModel): Promise<CreateUserResponse>
  deleteUser(userId: string): Promise<DeleteUserResponse>
  getUser(username: string): Promise<UserModel>
  updateRefreshToken(username: string, refreshToken: string)
  userExists(username: string): Promise<boolean>

  createVerificationLink(verificationObject: VerificationModel): Promise<void>
  markEmailVerified(verifyLinkId: string): Promise<void>
  createPasswordReset(passwordResetModel: PasswordResetModel): Promise<void>
  getPasswordReset(passwordResetId: string): Promise<PasswordResetModel>
  updatePasswordHash(username: string, passwordHash: string): Promise<void>
  emailToUsername(email: string): Promise<string>
}

export enum DatabaseTypes {
  DYNAMODB,
  TYPEORM
}

export function convert(provider: string): DatabaseTypes {
  // If you are wondering the "... as keyof typeof ...". Read about it here:
  //https://stackoverflow.com/questions/36316326/typescript-ts7015-error-when-accessing-an-enum-using-a-string-type-parameter
  return DatabaseTypes[provider.toUpperCase() as keyof typeof DatabaseTypes]
}

export function CreateDBAdapter(type: DatabaseTypes) {
  switch (type) {
    case DatabaseTypes.DYNAMODB:
      return new DynamoDBImpl()
      break
    case DatabaseTypes.TYPEORM:
      return new TypeORMImpl()
      break
    default:
      throw "an error"
  }
}
