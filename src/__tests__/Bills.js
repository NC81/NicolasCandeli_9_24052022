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

beforeAll(() => {
  Object.defineProperty(window, 'localStorage', { value: localStorageMock })
  window.localStorage.setItem('user', JSON.stringify({
    type: 'Employee'
  }))
})

describe("Given I am connected as an employee", () => {
  afterEach(() => {
    document.body.innerHTML= ""
  })
  describe("When I am on Bills page", () => {
    test("Then bill icon in vertical layout should be highlighted", async () => {
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
  })
  describe("When I am on Bills page and I click on an eye icon", () => {
    test("Then bill modal should be opened", () => {
      document.body.innerHTML = BillsUI({ data: bills })

      const mockBills = new Bills({document, onNavigate, store: null, localStorage})

      $.fn.modal = jest.fn();
      const eyes = screen.getAllByTestId('icon-eye')
      const handleClickIconEye = jest.fn(mockBills.handleClickIconEye(eyes[0]))

      eyes[0].addEventListener('click', handleClickIconEye)
      userEvent.click(eyes[0])
      expect(handleClickIconEye).toHaveBeenCalled()

      const modale = screen.getByTestId('modal-bill-image')
      expect(modale).toBeTruthy()
    })
  })
  describe("When I am on Bills page and I click on the new bill button", () => {
    test("Then I should go to NewBill page", async () => {
      const root = document.createElement("div")
      root.setAttribute("id", "root")
      document.body.appendChild(root)
      router()
      window.onNavigate(ROUTES_PATH.Bills)

      const mockBills = new Bills({document, onNavigate, mockStore, localStorage})

      const handleClickNewBill = jest.fn(mockBills.handleClickNewBill)

      await waitFor(() => screen.getByTestId("btn-new-bill"))
      const newBillButton = screen.getByTestId("btn-new-bill")
      expect(newBillButton).toBeTruthy()

      newBillButton.addEventListener('click', handleClickNewBill)
      userEvent.click(newBillButton)
      expect(handleClickNewBill).toHaveBeenCalled()

      await waitFor(() => screen.getAllByText("Envoyer une note de frais"))
      const BillsPage = screen.getAllByText("Envoyer une note de frais")
      expect(BillsPage).toBeTruthy()
    })
  })
  describe("When I navigate to Bills page and it's loading", () => {
    test("Then loading page should be rendered", () => {
      document.body.innerHTML = BillsUI({ loading: true })
      const LoadingPage = screen.getAllByText("Loading...")
      expect(LoadingPage).toBeTruthy()
    })
  })
  describe("When I navigate to Bills page and an error occurs", () => {
    test("Then error page should be rendered", () => {
      document.body.innerHTML = BillsUI({ error: "Erreur 500" })
      const ErrorPage = screen.getAllByText("Erreur 500")
      expect(ErrorPage).toBeTruthy()
    })
  })
})

// Test d'intégration GET
describe("Given I am a user connected as an employee", () => {
  describe("When I navigate to Bills page", () => {
    test("Then it fetches bills from mock API GET", async () => {
      const root = document.createElement("div")
      root.setAttribute("id", "root")
      document.body.append(root)
      router()
      window.onNavigate(ROUTES_PATH.Bills)

      await new Promise(process.nextTick)
      const billIsWaiting = await screen.getAllByText(/En attente/).map(a => a)
      expect(billIsWaiting.length).toBe(1)
      const billIsAccepted = await screen.getAllByText(/Accepté/).map(a => a)
      expect(billIsAccepted.length).toBe(1)
      const billIsRefused = await screen.getAllByText(/Refusé/).map(a => a)
      expect(billIsRefused.length).toBe(2)
    })
  })
  describe("When I navigate to Bills page and an error occurs on API", () => {
    beforeEach(() => {
      jest.spyOn(mockStore, "bills")
      const root = document.createElement("div")
      root.setAttribute("id", "root")
      document.body.appendChild(root)
      router()
    })
    test("Then it fetches from an API and fails with 404 message error", async () => {
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
    test("Then it fetches from an API and fails with 500 message error", async () => {
      mockStore.bills.mockImplementationOnce(() => {
        return {
          list : () =>  {
            return Promise.reject(new Error("Erreur 500"))
          }
        }})
      window.onNavigate(ROUTES_PATH.Bills)
      await new Promise(process.nextTick)
      const message = await screen.getByText(/Erreur 500/)
      expect(message).toBeTruthy()
    })
  })
})