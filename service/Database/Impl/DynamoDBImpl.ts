import { DynamoDB, config, SharedIniFileCredentials, AWSError } from "aws-sdk"
import { DatabaseImpl } from "../DatabaseFactory"
import {
  CreateUserResponse,
  GetUserResponse,
  UpdateUserResponse,
  DeleteUserResponse,
} from "../Responses"
import { UserModel } from "../../../models/UserModel"
import { UserDoesNotExistException } from "../../../exceptions/UserDoesNotExistException"
import { DBConnectionException } from "../../../exceptions/DBConncetionException"
import { VerificationModel } from "../../../models/VerificationModel"
import { PasswordResetModel } from "../../../models/PasswordResetModel"
import UserService from "../../User"
import { CouldNotGetItemException } from "../../../exceptions/CouldNotGetItemException"
import { DBQueryFailedException } from "../../../exceptions/DBQueryFailedException"
import * as logg from "loglevel"

const log = logg.getLogger("DynamoDBImpl")
log.setLevel("debug")

const credentials = new SharedIniFileCredentials({ profile: "kuka-dynamo" })
config.credentials = credentials

config.update({ region: "eu-north-1" })

const docClient = new DynamoDB.DocumentClient()

export class DynamoDBImpl implements DatabaseImpl {
  async createUser(user: UserModel): Promise<CreateUserResponse> {
    const userModel: UserModelForDynamoDB = this.userModelToDynamoDBModel(user)
    log.debug("Trying to print userModel variable")
    log.debug(userModel)
    log.debug("Does this display without server restart")
    log.debug("What about this")
    const params = { TableName: "kuka-users", Item: userModel }
    try {
      await docClient.put(params).promise()
      return { ok: 1, data: { message: "User succesfully created!" } }
    } catch (e) {
      console.log(e)
      return {
        ok: 0,
        data: {
          message: e.message,
        },
      }
    }
  }

  async getUser(username: string): Promise<UserModel> {
    const pksk = "USER#" + username
    const params = {
      TableName: "kuka-users",
      Key: { pk: pksk, sk: pksk },
    }

    try {
      const result = await docClient.get(params).promise()
      if (!result || !result.Item) {
        throw new UserDoesNotExistException()
      } else {
        const userModel = this.dynamoDBToUserModel(result.Item as UserModelForDynamoDB) 
        return userModel
      }
    } catch (e) {
      console.log(e)
      throw new DBConnectionException()
    }
  }

  async userExists(username: string): Promise<boolean> {
    const key = "USER#" + username
    const params = {
      TableName: "kuka-users",
      Key: { pk: key, sk: key },
    }

    try {
      const result = await docClient.get(params).promise()
      console.log("User exist result")
      console.log(result)
      if (result && result.Item && result.Item.pk === "USER#" + username) {
        return true
      } else {
        return false
      }
    } catch (e) {
      console.log(e)
      throw new DBConnectionException()
    }
  }

  async updateRefreshToken(
    username: string,
    refreshToken: string
  ): Promise<void> {
    const key = "USER#" + username
    const params = {
      TableName: "kuka-users",
      Key: { pk: key, sk: key },
      UpdateExpression: "set refreshToken = :r",
      ExpressionAttributeValues: {
        ":r": refreshToken,
      },
    }
    await docClient.update(params).promise()
  }

  async deleteUser(userId: string): Promise<DeleteUserResponse> {
    const params = {
      TableName: "kuka-users",
      Key: { userId },
    }
    try {
      await docClient.delete(params).promise()
      return {
        ok: 1,
        data: {
          message: "User deleted",
        },
      }
    } catch (e) {
      console.log(e)

      return {
        ok: 0,
        data: {
          message: "Couldn't delete user",
          error: e.message,
        },
      }
    }
  }

  async createVerificationLink(verifyObject: VerificationModel): Promise<void> {
    const params = {
      TableName: "kuka-users",
      Item: this.verificationModelToDynamoDBModel(verifyObject),
    }
    try {
      await docClient.put(params).promise()
    } catch (e) {
      console.log(e)
      throw new DBConnectionException()
    }
  }

  async markEmailVerified(verifyLinkId: string): Promise<void> {
    try {
      var params = {
        TableName: "kuka-verifyLink",
        Key: {
          verifyLinkId,
        },
        UpdateExpression: "set clicked = :bool",
        ExpressionAttributeValues: {
          ":bool": true,
        },
        ReturnValues: "ALL_NEW",
      }
      const result = await docClient.update(params).promise()
      const username = result.Attributes.username
      var emailVerifiedRequest = {
        TableName: "kuka-users",
        Key: {
          username: username,
        },
        UpdateExpression: "set emailVerified = :bool",
        ExpressionAttributeValues: {
          ":bool": true,
        },
      }
      await docClient.update(emailVerifiedRequest).promise()
    } catch (e) {
      console.log(e)
      throw new DBConnectionException()
    }
  }

  async createPasswordReset(
    passwordResetModel: PasswordResetModel
  ): Promise<void> {
    try {
      const { passwordResetId, email, clicked } = passwordResetModel
      const userService = new UserService()
      const username = await userService.emailToUsername(email)
      const date = new Date()
      const creationDate = date.toISOString()
      const passwordResetItem = {
        email,
        username,
        clicked,
        passwordResetId,
        creationDate,
      }
      const params = {
        TableName: "kuka-passwordReset",
        Item: passwordResetItem,
      }
      await docClient.put(params).promise()
    } catch (e) {
      throw new DBConnectionException()
    }
  }

  async getPasswordReset(passwordResetId: string): Promise<PasswordResetModel> {
    const params = {
      TableName: "kuka-passwordReset",
      Key: { passwordResetId },
    }

    try {
      const result = await docClient.get(params).promise()
      if (!result) {
        throw new CouldNotGetItemException()
      } else {
        return result.Item as PasswordResetModel
      }
    } catch (e) {
      console.log(e)
      throw new DBConnectionException()
    }
  }

  async updatePasswordHash(
    username: string,
    passwordHash: string
  ): Promise<void> {
    try {
      const params = {
        TableName: "kuka-users",
        Key: {
          username,
        },
        UpdateExpression: "set passwordHash = :r",
        ExpressionAttributeValues: {
          ":r": passwordHash,
        },
      }
      await docClient.update(params).promise()
    } catch (e) {
      throw new DBConnectionException()
    }
  }

  async emailToUsername(email: string): Promise<string> {
    const params = {
      TableName: "kuka-users",
      IndexName: "email-index",
      KeyConditionExpression: "email  = :email",
      ExpressionAttributeValues: {
        ":email": email,
      },
      ProjectionExpression: "username",
    }
    let result
    try {
      result = await docClient.query(params).promise()
    } catch (e) {
      throw new DBConnectionException()
    }

    if (Array.isArray(result.Items) && result.Items.length > 0) {
      return result.Items[0].username
    } else {
      throw new DBQueryFailedException()
    }
  }

  private userModelToDynamoDBModel(user: UserModel): UserModelForDynamoDB {
    const {
      username,
      email,
      passwordHash,
      emailVerified,
      refreshToken,
      scopes,
      lockId,
    } = user
    return {
      pk: "USER#" + username,
      sk: "USER#" + username,
      email,
      passwordHash,
      emailVerified,
      refreshToken,
      scopes,
      lockId,
    }
  }

  private dynamoDBToUserModel(user: UserModelForDynamoDB): UserModel {
    const {
      pk,
      email,
      passwordHash,
      emailVerified,
      refreshToken,
      scopes,
      lockId,
    } = user
    return {
      username: pk.split("#")[1],
      email,
      passwordHash,
      emailVerified,
      refreshToken,
      scopes,
      lockId,
    }
  }
  private verificationModelToDynamoDBModel(
    verification: VerificationModel
  ): VerificationModelForDynamoDB {
    return {
      pk: "USER#" + verification.username,
      sk: "VER#" + verification.verifyLinkId,
      emailVerified: verification.clicked,
    }
  }
}

interface UserModelForDynamoDB {
  pk: string
  sk: string
  email: string
  passwordHash: string
  emailVerified: boolean
  refreshToken?: string
  scopes: string[]
  lockId?: number
}

interface VerificationModelForDynamoDB {
  pk: string
  sk: string
  emailVerified: boolean
}
