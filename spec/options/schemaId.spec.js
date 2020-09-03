"use strict"

var Ajv = require("../ajv")
var should = require("../chai").should()

describe("removed schemaId option", () => {
  it("should use $id and ignore id", () => {
    test(new Ajv({logger: false}))
    test(new Ajv({schemaId: "$id", logger: false}))

    function test(ajv) {
      ajv.addSchema({$id: "mySchema1", type: "string"})
      var validate = ajv.getSchema("mySchema1")
      validate("foo").should.equal(true)
      validate(1).should.equal(false)

      validate = ajv.compile({id: "mySchema2", type: "string"})
      should.not.exist(ajv.getSchema("mySchema2"))
    }
  })
})
