import { RoleModel, type RoleDocument } from '../models/role.model'

export const roleRepository = {
  findById(id: string): Promise<RoleDocument | null> {
    return RoleModel.findOne({ _id: id, isDeleted: false })
  },

  findByName(name: string): Promise<RoleDocument | null> {
    return RoleModel.findOne({ name: name.toUpperCase(), isDeleted: false })
  },

  /** DATABASE.md §3.1: "small collection, list all (no pagination needed in practice)". */
  listAll(): Promise<RoleDocument[]> {
    return RoleModel.find({ isDeleted: false }).sort({ name: 1 })
  },
}
