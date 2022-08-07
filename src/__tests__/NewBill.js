/**
 * @jest-environment jsdom
 */

import '@testing-library/jest-dom'
import { fireEvent, screen, waitFor } from "@testing-library/dom"
import NewBillUI from "../views/NewBillUI.js"
import NewBill from "../containers/NewBill.js"
import userEvent from '@testing-library/user-event'
import { localStorageMock } from "../__mocks__/localStorage.js"
import mockStore from "../__mocks__/store"
import { ROUTES_PATH, ROUTES } from "../constants/routes"
import router from "../app/Router"

jest.mock("../app/store", () => mockStore)

describe("Given I am connected as an employee", () => {
  describe("When I am on NewBill Page", () => {
    test("Then mail icon in vertical layout should be highlighted", async () => {
      Object.defineProperty(window, 'localStorage', { value: localStorageMock })
      window.localStorage.setItem('user', JSON.stringify({
        type: 'Employee'
      }))
      const root = document.createElement("div")
      root.setAttribute("id", "root")
      document.body.append(root)
      router()
      window.onNavigate(ROUTES_PATH.NewBill)
      await waitFor(() => screen.getByTestId('icon-mail'))
      const windowIcon = screen.getByTestId('icon-mail')
      expect(windowIcon).toHaveClass('active-icon')
    })
    test("Then title and form should be rendered", () => {
      const title = screen.getByText("Envoyer une note de frais")
      const form = screen.getByTestId("form-new-bill")
      expect(title).toBeTruthy()
      expect(form).toBeTruthy()
    })
    describe("And I click on the file input", () => {
      describe("And I select a file with the wrong extension", () => {
        test("Then an error message is displayed", async () => {
          Object.defineProperty(window, 'store', { value: mockStore })
          const newBill = new NewBill({document, onNavigate, store, localStorage})
          document.body.innerHTML = NewBillUI();

          console.error = jest.fn()
          const spyCreate = jest.spyOn(mockStore.bills(), "create")
          const handleChange = jest.fn((e) => newBill.handleChangeFile(e))

          const input = screen.getByTestId("file")
          input.addEventListener('change', handleChange)
          fireEvent.change(input, {
            target: {
              files: [new File(["monImage.pdf"], "monImage.pdf", { type: "image/png" })]
            }
          })
          const errorMessage = screen.getByTestId('error')

          expect(handleChange).toHaveBeenCalled()
          expect(input.files[0].name).toBe("monImage.pdf")
          expect(spyCreate).not.toHaveBeenCalled()
          expect(console.error).toHaveBeenCalled()
          expect(errorMessage).toHaveClass('visible')
        })
      })
      describe("And I select an image file with the correct extension", () => {
        test("Then a new bill is created and no error message is displayed", () => {
          Object.defineProperty(window, 'store', { value: mockStore })
          const newBill = new NewBill({document, onNavigate, store, localStorage})
          document.body.innerHTML = NewBillUI();
          
          console.error = jest.fn()
          const spyCreate = jest.spyOn(mockStore.bills(), "create")
          const handleChange = jest.fn((e) => newBill.handleChangeFile(e))
          
          const input = screen.getByTestId("file")
          input.addEventListener('change', handleChange)
          fireEvent.change(input, {
            target: {
              files: [new File(["monImage.png"], "monImage.png", { type: "image/png" })]
            }
          })
          const errorMessage = screen.getByTestId('error')

          expect(handleChange).toHaveBeenCalled()
          expect(input.files[0].name).toBe("monImage.png")
          expect(spyCreate).toHaveBeenCalled()
          expect(console.error).not.toHaveBeenCalled()
          expect(errorMessage).not.toHaveClass('visible')
        })
      })
    })
  })
})

// Test d'intégration POST
describe("Given I am a user connected as Employee and I am on New Bill page", () => {
  describe("When I fill out the form correctly", () => {
    const bill = {
      email: "a@a",
      type: "Transports",
      name:  "Voyage en Italie",
      amount: 222,
      date:  "2020-05-24",
      vat: "19",
      pct: parseInt("") || 20,
      commentary: "Séminaire",
      fileUrl: 'https://localhost:3456/images/monImage.png',
      fileName: "monImage.png",
      status: 'pending'
    }
    test("Then submitting a new bill should work as intended" , async () => {
      Object.defineProperty(window, 'store', { value: mockStore })
      Object.defineProperty(window, 'localStorage', { value: localStorageMock })
      window.localStorage.setItem('user', JSON.stringify({
        type: 'Employee',
        email: "a@a"
      }))
      const root = document.createElement("div")
      root.setAttribute("id", "root")
      document.body.appendChild(root)
      router()

      const onNavigate = (pathname) => {
        document.body.innerHTML = ROUTES({ pathname })
      }
      document.body.innerHTML = NewBillUI();

      const newBill = new NewBill({document, onNavigate, store, localStorage})

      const type = screen.queryByTestId('expense-type')
      const name = screen.queryByTestId('expense-name')
      const datePicker = screen.queryByTestId('datepicker')
      const amount = screen.queryByTestId('amount')
      const vat = screen.queryByTestId('vat')
      const commentary = screen.queryByTestId('commentary')

      userEvent.selectOptions(type, bill.type)
      userEvent.type(name, bill.name)
      fireEvent.change(datePicker, {target: {value: bill.date}})
      userEvent.type(amount, (bill.amount).toString())
      userEvent.type(vat, bill.vat)
      userEvent.type(commentary, bill.commentary)
      newBill.fileUrl = bill.fileUrl
      newBill.fileName = bill.fileName

      expect(type.validity.valid).toBeTruthy()
      expect(name.validity.valid).toBeTruthy()
      expect(datePicker.validity.valid).toBeTruthy()
      expect(amount.validity.valid).toBeTruthy()
      expect(vat.validity.valid).toBeTruthy()
      expect(commentary.validity.valid).toBeTruthy()

      const spyStoreUpdate = jest.spyOn(mockStore.bills(), "update")
      const spyUpdateMethod = jest.spyOn(newBill, 'updateBill')
      const handleSubmit = jest.fn((e) => newBill.handleSubmit(e))

      const form = screen.getByTestId('form-new-bill')
      form.addEventListener('submit', handleSubmit)
      fireEvent.submit(form)

      expect(handleSubmit).toHaveBeenCalled()
      expect(spyUpdateMethod).toHaveBeenCalledWith(bill)
      expect(spyStoreUpdate).toHaveBeenCalled()
    })
    test("Then the mocked new bill should be stored", async () => {
      jest.spyOn(mockStore, "bills")

      mockStore.bills.mockImplementationOnce(() => {
        return {
          update: () => {
            return Promise.resolve({
              data: JSON.stringify(bill),
              selector: "19qFXb6fKm2z5KkLzMr9"
            })
          }
        }
      })
      const billPromise = mockStore.bills().update()
      const updatedBill = await billPromise.then((value) => value)
      expect(JSON.parse(updatedBill.data).name).toEqual('Voyage en Italie')
      expect(JSON.parse(updatedBill.data).date).toEqual("2020-05-24")
    })
    test("Then I should be redirected to Bills page", async () => {
      await waitFor(() => screen.getAllByText("Mes notes de frais"))
      const BillsPage = screen.getAllByText("Mes notes de frais")
      expect(BillsPage).toBeTruthy()
    })
  })
  describe("When an error 404 occurs on API after submitting a new bill", () => {
    test("Then it fetches an error 404 from API and fails with a console error", async () => {
      const spyStoreUpdate = jest.spyOn(mockStore.bills(), "update")
      jest.spyOn(mockStore, "bills")
      console.error = jest.fn()

      Object.defineProperty(window, 'store', { value: mockStore })
      window.localStorage.setItem('user', JSON.stringify({
        type: 'Employee'
      }))
      const root = document.createElement("div")
      root.setAttribute("id", "root")
      document.body.appendChild(root)
      router()

      const onNavigate = (pathname) => {
        document.body.innerHTML = ROUTES({ pathname })
      }
      window.onNavigate(ROUTES_PATH.NewBill)

      const newBill = new NewBill({document, onNavigate, store, localStorage})

      mockStore.bills.mockImplementationOnce(() => {
        return {
          update : () =>  {
            return Promise.reject(new Error("Erreur 404"))
          }
        }})
      const handleSubmit = jest.fn((e) => newBill.handleSubmit(e))
      const form = screen.getByTestId('form-new-bill')
      form.addEventListener('submit', handleSubmit)
      
      fireEvent.submit(form)
      await new Promise(process.nextTick)
    
      expect(handleSubmit).toHaveBeenCalled()
      expect(spyStoreUpdate).toHaveBeenCalled()
      expect(console.error).toHaveBeenCalled()
    })
  })
})