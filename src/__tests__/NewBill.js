/**
 * @jest-environment jsdom
 */

import "@testing-library/jest-dom"
import { fireEvent, screen, waitFor } from "@testing-library/dom"
import NewBill from "../containers/NewBill.js"
import userEvent from "@testing-library/user-event"
import { localStorageMock } from "../__mocks__/localStorage.js"
import mockStore from "../__mocks__/store"
import { ROUTES_PATH } from "../constants/routes"
import router from "../app/Router"

jest.mock("../app/store", () => mockStore)

beforeAll(() => {
  Object.defineProperty(window, "store", { value: mockStore })
  Object.defineProperty(window, "localStorage", { value: localStorageMock })
  window.localStorage.setItem("user", JSON.stringify({
    type: "Employee",
    email: "a@a"
  }))
})

beforeEach(() => {
  const root = document.createElement("div")
  root.setAttribute("id", "root")
  document.body.appendChild(root)
  router()
  window.onNavigate(ROUTES_PATH.NewBill)
})

describe("Given I am connected as an employee", () => {
  describe("When I am on NewBill page", () => {
    test("Then mail icon in vertical layout should be highlighted", () => {
      const windowIcon = screen.getByTestId("icon-mail")
      expect(windowIcon).toHaveClass("active-icon")
    })
    test("Then NewBill page should be rendered", () => {
      const title = screen.getByText("Envoyer une note de frais")
      const form = screen.getByTestId("form-new-bill")
      expect(title).toBeTruthy()
      expect(form).toBeTruthy()
    })
  })
  describe("When I am on NewBill page and I add a file with the wrong extension to the file input", () => {
    test("Then no new bill creation should be initiated and an error message should be rendered", () => {
      const newBill = new NewBill({document, onNavigate, store, localStorage})

      console.error = jest.fn()
      const spyCreate = jest.spyOn(mockStore.bills(), "create")
      const handleChange = jest.fn((e) => newBill.handleChangeFile(e))

      const errorMessage = screen.getByTestId("error")
      const input = screen.getByTestId("file")

      input.addEventListener("change", handleChange)
      fireEvent.change(input, {
        target: {
          files: [new File(["monImage.pdf"], "monImage.pdf", { type: "image/png" })]
        }
      })

      expect(handleChange).toHaveBeenCalled()
      expect(input.files[0].name).toBe("monImage.pdf")
      expect(spyCreate).not.toHaveBeenCalled()
      expect(console.error).toHaveBeenCalled()
      expect(errorMessage).toHaveClass("visible")
    })
  })
  describe("When I am on NewBill page and I add a file with the correct extension to the file input", () => {
    test("Then new bill creation should be initiated and no error message should be rendered", () => {
      const newBill = new NewBill({document, onNavigate, store, localStorage})
      
      console.error = jest.fn()
      const spyCreate = jest.spyOn(mockStore.bills(), "create")
      const handleChange = jest.fn((e) => newBill.handleChangeFile(e))
      
      const errorMessage = screen.getByTestId("error")
      const input = screen.getByTestId("file")

      input.addEventListener("change", handleChange)
      fireEvent.change(input, {
        target: {
          files: [new File(["monImage.png"], "monImage.png", { type: "image/png" })]
        }
      })

      expect(handleChange).toHaveBeenCalled()
      expect(input.files[0].name).toBe("monImage.png")
      expect(spyCreate).toHaveBeenCalled()
      expect(console.error).not.toHaveBeenCalled()
      expect(errorMessage).not.toHaveClass("visible")
    })
  })
})

// Test d'intégration POST
describe("Given I am a user connected as an employee", () => {
  describe("When I am on NewBill page and I fill out the form correctly", () => {
    const bill = {
      email: "a@a",
      type: "Hôtel et logement",
      name:  "encore",
      amount: 400,
      date:  "2004-04-04",
      vat: "80",
      pct: parseInt("") || 20,
      commentary: "séminaire billed",
      fileUrl: "https://firebasestorage.googleapis.com/v0/b/billable-677b6.a…f-1.jpg?alt=media&token=c1640e12-a24b-4b11-ae52-529112e9602a",
      fileName: "preview-facture-free-201801-pdf-1.jpg",
      status: "pending"
    }
    test("Then submitting a new bill should complete new bill creation" , async () => {
      const newBill = new NewBill({document, onNavigate, store, localStorage})
      
      const type = screen.queryByTestId("expense-type")
      const name = screen.queryByTestId("expense-name")
      const datePicker = screen.queryByTestId("datepicker")
      const amount = screen.queryByTestId("amount")
      const vat = screen.queryByTestId("vat")
      const commentary = screen.queryByTestId("commentary")
      const input = screen.getByTestId("file")

      userEvent.selectOptions(type, bill.type)
      userEvent.type(name, bill.name)
      fireEvent.change(datePicker, {target: {value: bill.date}})
      userEvent.type(amount, (bill.amount).toString())
      userEvent.type(vat, bill.vat)
      userEvent.type(commentary, bill.commentary)
      userEvent.upload(input, new File(["image"], bill.fileName, { type: "image/png" }))

      newBill.fileUrl = bill.fileUrl
      newBill.fileName = bill.fileName

      expect(type.validity.valid).toBeTruthy()
      expect(name.validity.valid).toBeTruthy()
      expect(datePicker.validity.valid).toBeTruthy()
      expect(amount.validity.valid).toBeTruthy()
      expect(vat.validity.valid).toBeTruthy()
      expect(commentary.validity.valid).toBeTruthy()
      expect(input.files.length).toBe(1)

      const handleSubmit = jest.fn((e) => newBill.handleSubmit(e))
      const spyUpdateBill = jest.spyOn(newBill, "updateBill")
      const spyStoreUpdate = jest.spyOn(mockStore.bills(), "update")

      const form = screen.getByTestId("form-new-bill")
      form.addEventListener("submit", handleSubmit)
      fireEvent.submit(form)

      expect(handleSubmit).toHaveBeenCalled()
      expect(spyUpdateBill).toHaveBeenCalledWith(bill)
      expect(spyStoreUpdate).toHaveBeenCalled()

      await waitFor(() => screen.getAllByText("Mes notes de frais"))
      const BillsPage = screen.getAllByText("Mes notes de frais")
      expect(BillsPage).toBeTruthy()
    })
    test("Then the new created bill should be stored", async () => {
      const storedBill = await mockStore.bills().update().then((value) => value)

      expect(storedBill.type).toEqual(bill.type)
      expect(storedBill.date).toEqual(bill.date)
      expect(storedBill.vat).toEqual(bill.vat)
      expect(storedBill.fileName).toEqual(bill.fileName)
    })
  })
  describe("When I am on NewBill page and an error occurs on API", () => {
    test("Then adding a file to the file input fails with a 404 console message error", async () => {
      jest.spyOn(mockStore, "bills")
      const spyStoreCreate = jest.spyOn(mockStore.bills(), "create")
      console.error = jest.fn()

      const newBill = new NewBill({document, onNavigate, store, localStorage})

      mockStore.bills.mockImplementationOnce(() => {
        return {
          create : () =>  {
            return Promise.reject(new Error("Erreur 404"))
          }
        }
      })
  
      const handleChange = jest.fn((e) => newBill.handleChangeFile(e))
      const input = screen.getByTestId("file")
      input.addEventListener("change", handleChange)
      
      fireEvent.change(input, {
        target: {
          files: [new File(["monImage.png"], "monImage.png", { type: "image/png" })]
        }
      })

      await new Promise(process.nextTick)
      expect(handleChange).toHaveBeenCalled()
      expect(spyStoreCreate).toHaveBeenCalled()
      expect(console.error).toHaveBeenCalled()
    })
    test("Then submitting a new bill fails with 500 console message error", async () => {
      jest.spyOn(mockStore, "bills")
      const spyStoreUpdate = jest.spyOn(mockStore.bills(), "update")
      console.error = jest.fn()

      const newBill = new NewBill({document, onNavigate, store, localStorage})

      mockStore.bills.mockImplementationOnce(() => {
        return {
          update : () =>  {
            return Promise.reject(new Error("Erreur 500"))
          }
        }
      })

      const handleSubmit = jest.fn((e) => newBill.handleSubmit(e))
      const form = screen.getByTestId("form-new-bill")
      form.addEventListener("submit", handleSubmit)
      
      fireEvent.submit(form)
      
      await new Promise(process.nextTick)
      expect(handleSubmit).toHaveBeenCalled()
      expect(spyStoreUpdate).toHaveBeenCalled()
      expect(console.error).toHaveBeenCalled()
    })
  })
})