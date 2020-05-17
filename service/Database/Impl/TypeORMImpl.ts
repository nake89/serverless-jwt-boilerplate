import {
  CreateUserResponse,
  DeleteUserResponse,
  GetUserResponse,
  UpdateUserResponse
} from "../Responses"
import {UserModel} from "../../../models/UserModel"
import {DatabaseImpl} from "../DatabaseFactory"
import {Connection} from "typeorm"
import ProjectConnection from "../../Connection"
import User from "../../../entities/User"
import Scope from "../../../entities/Scope"
import VerificationService from "../../Verification"
import {UserDoesNotExistException} from "../../../exceptions/UserDoesNotExistException"
import {DBConnectionException} from "../../../exceptions/DBConncetionException"
import {VerificationModel} from "../../../models/VerificationModel"
import Verification from "../../../entities/Verification"
import {PasswordResetModel} from "../../../models/PasswordResetModel"
import UserService from "../../User"
import PasswordResetService from "../../Reset"
import PasswordReset from "../../../entities/PasswordReset"
import {DBQueryFailedException} from "../../../exceptions/DBQueryFailedException"

export class TypeORMImpl implements DatabaseImpl {
  async createUser(userModel: UserModel): Promise<CreateUserResponse> {
    const {userId, username, passwordHash, email, emailVerified} = userModel
    let connection: Connection = await ProjectConnection.connect()
    if (connection) {
      const findCount: [User[], number] = await User.findAndCount()
      const userCount: number = findCount[1]
      let firstUser: boolean
      if (!userCount || userCount == 0) {
        firstUser = true
      } else {
        firstUser = false
      }
      if (await this.userExists(username)) {
        return {
          ok: 0,
          data: {
            error: "Couldn't create user. User exists",
            message: "Couldn't create user. User exists"
          }
        }
      }
      const user: User = new User()
      user.id = userId
      user.username = username
      user.passwordHash = passwordHash
      user.email = email
      user.emailVerified = emailVerified
      const defaultScope: Scope = new Scope()
      defaultScope.scope = "default"
      await Scope.save(defaultScope)
      user.scopes = [defaultScope]
      // Give the first user created root scope
      if (firstUser) {
        const rootScope: Scope = new Scope()
        rootScope.scope = "root"
        await Scope.save(rootScope)
        user.scopes.push(rootScope)
      }
      await User.save(user)
      try {
        await VerificationService.createVerificationLink({username, email})
      } catch (e) {
        throw e
      }

      return {
        ok: 1,
        data: {
          message: "User successfully created!"
        }
      }
    } else {
      throw new DBConnectionException()
    }
  }
  async deleteUser(userId: string): Promise<DeleteUserResponse> {
    return {ok: 0, data: {message: "Fail"}}
  }

  async getUser(username: string): Promise<UserModel> {
    const convert = (user: User): UserModel => {
      const scopeArray: Scope[] = user.scopes
      const scopes: string[] = scopeArray.map((item) => {
        return item.scope
      })
      const {
        id,
        username,
        email,
        emailVerified,
        passwordHash,
        refreshToken,
        lockId
      } = user
      return {
        userId: id,
        username,
        email,
        emailVerified,
        passwordHash,
        refreshToken,
        lockId,
        scopes
      }
    }

    let connection: Connection = await ProjectConnection.connect()
    if (connection) {
      const user: User = await User.findOne({username}, {relations: ["scopes"]})
      if (!user) {
        throw new UserDoesNotExistException()
      }
      return convert(user)
    } else {
      throw new DBConnectionException()
    }
  }

  async userExists(username: string): Promise<boolean> {
    try {
      await ProjectConnection.connect()
      const user: User = await User.findOne({username})
      if (!user) {
        return false
      } else {
        true
      }
    } catch (e) {
      throw new DBConnectionException()
    }
  }

  async updateRefreshToken(
    username: string,
    refreshToken: string
  ): Promise<void> {
    let connection: Connection = await ProjectConnection.connect()
    if (connection) {
      const user: User = await User.findOne({username}, {relations: ["scopes"]})
      if (!user) {
        throw new UserDoesNotExistException()
      } else {
        await User.save(user)
      }
    } else {
      throw new DBConnectionException()
    }
  }

  async createVerificationLink(
    verificationObject: VerificationModel
  ): Promise<void> {
    try {
      await ProjectConnection.connect()
      const {username, verifyLinkId, clicked} = verificationObject
      const verification = new Verification()
      verification.username = username
      verification.verifyLinkId = verifyLinkId
      verification.clicked = clicked
      await Verification.save(verification)
    } catch (e) {
      console.log(e)
      throw new DBConnectionException()
    }
  }

  async markEmailVerified(verifyLinkId: string): Promise<void> {
    try {
      await ProjectConnection.connect()
    } catch (e) {
      throw new DBConnectionException()
    }

    try {
      const verification: Verification = await Verification.findOne({
        verifyLinkId
      })
      verification.clicked = true
      let {username} = verification
      await Verification.save(verification)
      const user = await User.findOne({username})
      user.emailVerified = true
      await User.save(user)
    } catch (e) {
      throw new DBConnectionException()
    }
  }

  async createPasswordReset(
    passwordResetModel: PasswordResetModel
  ): Promise<void> {
    try {
      await ProjectConnection.connect()
      const {passwordResetId, email, clicked} = passwordResetModel
      const userService = new UserService()
      const passwordReset = new PasswordReset()
      passwordReset.username = await userService.emailToUsername(email)
      passwordReset.passwordResetId = passwordResetId
      passwordReset.email = email
      passwordReset.clicked = clicked
      await PasswordReset.save(passwordReset)
    } catch (e) {
      throw new DBConnectionException()
    }
  }

  async getPasswordReset(passwordResetId: string): Promise<PasswordResetModel> {
    try {
      await ProjectConnection.connect()
      const passwordReset: PasswordReset = await PasswordReset.findOne({
        passwordResetId
      })

      const {username, email, creationDate, clicked} = passwordReset

      return {
        username,
        email,
        creationDate: creationDate.toISOString(),
        clicked,
        passwordResetId
      }
    } catch (e) {
      throw new DBConnectionException()
    }
  }

  async updatePasswordHash(
    username: string,
    passwordHash: string
  ): Promise<void> {
    try {
      await ProjectConnection.connect()
      const user: User = await User.findOne({username})
      user.passwordHash = passwordHash
      await User.save(user)
    } catch (e) {
      throw new DBConnectionException()
    }
  }

  async emailToUsername(email: string): Promise<string> {
    let findUser: User
    try {
      await ProjectConnection.connect()
      findUser = await User.findOne({email})
    } catch (e) {
      throw new DBConnectionException()
    }
    if (findUser) {
      return findUser.username
    } else {
      throw new DBQueryFailedException()
    }
  }
}
