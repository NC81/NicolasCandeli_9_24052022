/**
 * @jest-environment jsdom
 */

import '@testing-library/jest-dom'
import { screen, waitFor } from "@testing-library/dom"
import userEvent from '@testing-library/user-event'
import { ROUTES_PATH } from "../constants/routes"
import { localStorageMock } from "../__mocks__/localStorage.js"
import mockStore from "../__mocks__/store"
import BillsUI from "../views/BillsUI.js"
import Bills from '../containers/Bills.js'
import { bills } from "../fixtures/bills"
import router from "../app/Router"
 
jest.mock("../app/store", () => mockStore)

describe("Given I am connected as an employee", () => {
  describe("When I am on Bills Page", () => {
    test("Then bill icon in vertical layout should be highlighted", async () => {
      Object.defineProperty(window, 'localStorage', { value: localStorageMock })
      window.localStorage.setItem('user', JSON.stringify({
        type: 'Employee'
      }))
      const root = document.createElement("div")
      root.setAttribute("id", "root")
      document.body.append(root)
      router()
      window.onNavigate(ROUTES_PATH.Bills)
      await waitFor(() => screen.getByTestId('icon-window'))
      const windowIcon = screen.getByTestId('icon-window')
      expect(windowIcon).toHaveClass('active-icon')
    })
    test("Then bills should be ordered from earliest to latest", () => {
      document.body.innerHTML = BillsUI({ data: bills })
      const dates = screen.getAllByTestId('formatDate').map(a => a.innerHTML)
      const antiChrono = (a, b) => ((a < b) ? 1 : -1)
      const datesSorted = [...dates].sort(antiChrono)
      expect(dates).toEqual(datesSorted)
    })
    test("Then bills should be opened by clicking eye icon", () => {
      const bill = new Bills({
        document, onNavigate, store: null, localStorage: window.localStorage
      })
      $.fn.modal = jest.fn();
      const eyes = screen.getAllByTestId('icon-eye')
      const handleClickIconEye = jest.fn(bill.handleClickIconEye(eyes[0]))
      eyes[0].addEventListener('click', handleClickIconEye)
      userEvent.click(eyes[0])
      expect(handleClickIconEye).toHaveBeenCalled()
      const modale = screen.getByTestId('testmodal')
      expect(modale).toBeTruthy()
    })
    test("Then I go to the new bill page when I click on the new bill button", async () => {
      // Object.defineProperty(window, 'store', { value: mockStore })
      // Object.defineProperty(window, 'localStorage', { value: localStorageMock })
      window.localStorage.setItem('user', JSON.stringify({
        type: 'Employee'
      }))
      const root = document.createElement("div")
      root.setAttribute("id", "root")
      document.body.appendChild(root)
      router()
      const mockBills = new Bills({
        document, onNavigate, mockStore, localStorage
      })
      window.onNavigate(ROUTES_PATH.Bills)
      const handleClickNewBill = jest.fn(mockBills.handleClickNewBill)
      const newBillButton = screen.getByTestId("btn-new-bill")
      expect(newBillButton).toBeTruthy()
      newBillButton.addEventListener('click', handleClickNewBill)
      userEvent.click(newBillButton)
      expect(handleClickNewBill).toHaveBeenCalled()
      await waitFor(() => screen.getByTestId('form-new-bill'))
      const form = screen.getByTestId("form-new-bill")
      expect(form).toBeInTheDocument()
    })
  }) 
}) 

// Test d'intégration GET
describe("Given I am a user connected as Employee", () => {
  describe("When I navigate to Bills", () => {
    test("fetches bills from mock API GET", async () => {
      Object.defineProperty(window, 'store', { value: mockStore })
      Object.defineProperty(window, 'localStorage', { value: localStorageMock })
      window.localStorage.setItem('user', JSON.stringify({
        type: 'Employee'
      }))
      const root = document.createElement("div")
      root.setAttribute("id", "root")
      document.body.append(root)
      router()
      window.onNavigate(ROUTES_PATH.Bills)      
      // await waitFor(() => screen.getByText("Mes notes de frais"))
      await new Promise(process.nextTick)
      const billIsWaiting = await screen.getAllByText(/En attente/).map(a => a)
      expect(billIsWaiting.length).toBe(1)
      const billIsAccepted = await screen.getAllByText(/Accepté/).map(a => a)
      expect(billIsAccepted.length).toBe(1)
      const billIsRefused = await screen.getAllByText(/Refusé/).map(a => a)
      expect(billIsRefused.length).toBe(2)
    })
  })
  describe("When an error occurs on API", () => {
    beforeEach(() => {
      jest.spyOn(mockStore, "bills")
      Object.defineProperty(window, 'localStorage', { value: localStorageMock })
      window.localStorage.setItem('user', JSON.stringify({
        type: 'Employee'
      }))
      const root = document.createElement("div")
      root.setAttribute("id", "root")
      document.body.appendChild(root)
      router()
    })
    test("fetches bills from an API and fails with 404 message error", async () => {
      mockStore.bills.mockImplementationOnce(() => {
        return {
          list : () =>  {
            return Promise.reject(new Error("Erreur 404"))
          }
        }})
      window.onNavigate(ROUTES_PATH.Bills)      
      await new Promise(process.nextTick)
      const message = await screen.getByText(/Erreur 404/)
      expect(message).toBeTruthy()
    })
    test("fetches messages from an API and fails with 500 message error", async () => {
      mockStore.bills.mockImplementationOnce(() => {
        return {
          list : () =>  {
            return Promise.reject(new Error("Erreur 500"))
          }
        }})
      window.onNavigate(ROUTES_PATH.Bills)      
      await new Promise(process.nextTick);
      const message = await screen.getByText(/Erreur 500/)
      expect(message).toBeTruthy()
    })
  })
})