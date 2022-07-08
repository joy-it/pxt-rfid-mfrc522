/**
  * MFRC522 Block
  */
//% color="#275C6B" weight=100 icon="\uf2bb" block="MFRC522 RFID"
namespace MFRC522 {
    let Type2=0
    const BlockAdr: number[] = [8, 9, 10]
    let TPrescalerReg = 0x2B
    let TxControlReg = 0x14
    let PICC_READ = 0x30
    let PICC_ANTICOLL = 0x93
    let PCD_RESETPHASE = 0x0F
    let temp = 0
    let val = 0
    let uid: number[] = []

    let returnLen = 0
    let returnData:number[] = []
    let status = 0
    let u = 0
    let ChkSerNum = 0
    let returnBits:any = null
    let recvData : number[]= []
    let PCD_IDLE = 0
    let d=0

    let Status2Reg = 0x08
    let CommandReg = 0x01
    let BitFramingReg = 0x0D
    let MAX_LEN = 16
    let PCD_AUTHENT = 0x0E
    let PCD_TRANSCEIVE = 0x0C
    let PICC_REQIDL = 0x26
    let PICC_AUTHENT1A = 0x60

    let ComIrqReg = 0x04
    let DivIrqReg = 0x05
    let FIFODataReg = 0x09
    let FIFOLevelReg = 0x0A
    let ControlReg = 0x0C
    let Key = [255, 255, 255, 255, 255, 255]

    function SetBits (reg: number, mask: number) {
        let tmp = SPI_Read(reg)
        SPI_Write(reg, (tmp|mask))
    }

    function SPI_Write (adr: number, val: number) {
        pins.digitalWritePin(DigitalPin.P16, 0)
        pins.spiWrite((adr << 1) & 0x7E)
        pins.spiWrite(val)
        pins.digitalWritePin(DigitalPin.P16, 1)
    }

    function readFromCard ():string {
        let [status, Type2] = Request(PICC_REQIDL)
        if (status != 0) {
            return null, null
        }

        [status, uid] = AvoidColl()

        if (status != 0) {
            return null, null
        }

        let id = getIDNum(uid)
        TagSelect(uid)
        status = Authent(PICC_AUTHENT1A, 11, Key, uid)
        let data:NumberFormat.UInt8LE []= []
        let text_read=''
        let block: number[] = []
        if (status == 0) {
            for (let BlockNum of BlockAdr) {
                block = ReadRFID(BlockNum)
                if (block) {
                    data = data.concat(block)
                }
            }
            if (data) {
                for (let c of data) {
                text_read=text_read.concat(String.fromCharCode(c))
                }
            }
        }
        Crypto1Stop()
        return text_read
    }

    function SPI_Read (adr: number) {
        pins.digitalWritePin(DigitalPin.P16, 0)
        pins.spiWrite(((adr<<1)& 0x7E)|0x80)
        val = pins.spiWrite(0)
        pins.digitalWritePin(DigitalPin.P16, 1)
        return val
    }

    function writeToCard (txt: string): number {
        [status, Type2] = Request(PICC_REQIDL)

        if (status != 0) {
            return null, null
        }
        [status, uid] = AvoidColl()

        if (status != 0) {
            return null, null
        }

        let id=getIDNum(uid)
        TagSelect(uid)
        status=Authent(PICC_AUTHENT1A, 11, Key, uid)
        ReadRFID(11)

        if (status == 0) {
            let data:NumberFormat.UInt8LE []= []
            for (let i = 0; i < txt.length; i++){
                data.push(txt.charCodeAt(i))
            }

            for (let j = txt.length; j<48;j++){
                data.push(32)
            }

            let b = 0
            for (let BlockNum2 of BlockAdr) {
                WriteRFID(BlockNum2, data.slice((b*16), ((b+1)*16)))
                b ++
            }
        }

            Crypto1Stop()
            serial.writeLine("Written to Card")
            return id
        }


    function ReadRFID (blockAdr: number) {
        recvData = []
        recvData.push(PICC_READ)
        recvData.push(blockAdr)
        let pOut2=[]
        pOut2= CRC_Calculation(recvData)
        recvData.push(pOut2[0])
        recvData.push(pOut2[1])
        let [status, returnData, returnLen] = MFRC522_ToCard(PCD_TRANSCEIVE, recvData)

        if (status != 0) {
            serial.writeLine("Error while reading!")
        }

        if (returnData.length != 16) {
            return null
        }
        else {
            return returnData
        }
    }

    function ClearBits (reg: number, mask: number) {
        let tmp = SPI_Read(reg)
        SPI_Write(reg, tmp & (~mask))
    }



    function Request (reqMode: number):[number, any] {
        let Type:number[] = []
        SPI_Write(BitFramingReg, 0x07)
        Type.push(reqMode)
        let [status, returnData, returnBits] = MFRC522_ToCard(PCD_TRANSCEIVE, Type)

        if ((status != 0) || (returnBits != 16)) {
            status = 2
        }

        return [status, returnBits]
    }

    function AntennaON () {
        temp = SPI_Read(TxControlReg)
        if (~(temp & 0x03)) {
            SetBits(TxControlReg, 0x03)
        }
    }

    function AvoidColl ():[number,number[] ] {
        let SerNum = []
        ChkSerNum = 0
        SPI_Write(BitFramingReg, 0)
        SerNum.push(PICC_ANTICOLL)
        SerNum.push(0x20)
        let [status, returnData, returnBits] = MFRC522_ToCard(PCD_TRANSCEIVE, SerNum)

        if (status == 0) {
            if (returnData.length == 5) {
                for (let k = 0; k <= 3; k++) {
                    ChkSerNum = ChkSerNum ^ returnData[k]
                }
                if (ChkSerNum != returnData[4]) {
                    status = 2
                }
            }
            else {
                status = 2
            }
        }
        return [status, returnData]
    }

    function Crypto1Stop () {
        ClearBits(Status2Reg, 0x08)
    }


    function Authent (authMode: number, BlockAdr: number, Sectorkey: number[], SerNum: number[]) {
        let buff: number[] = []
        buff.push(authMode)
        buff.push(BlockAdr)
        for (let l=0; l <(Sectorkey.length);l++){
            buff.push(Sectorkey[l])
        }
        for (let m=0;m<4;m++){
            buff.push(SerNum[m])
        }
        [status, returnData, returnLen] = MFRC522_ToCard(PCD_AUTHENT, buff)
            if (status != 0){
            serial.writeLine("AUTH ERROR!")
        }
        if ((SPI_Read(Status2Reg) & 0x08)==0){
            serial.writeLine("AUTH ERROR2!")
        }
        return status
    }

    function MFRC522_ToCard (command: number, sendData: number[]):[number, number[],number] {
        returnData = []
        returnLen = 0
        status = 2
        let irqEN = 0x00
        let waitIRQ = 0x00
        let lastBits = null
        let n = 0

        if (command == PCD_AUTHENT){
            irqEN = 0x12
            waitIRQ = 0x10
        }

        if (command == PCD_TRANSCEIVE){
            irqEN = 0x77
            waitIRQ = 0x30
        }

        SPI_Write(0x02, irqEN | 0x80)
        ClearBits(ComIrqReg, 0x80)
        SetBits(FIFOLevelReg, 0x80)
        SPI_Write(CommandReg, PCD_IDLE)

        for (let o=0;o<(sendData.length);o++){
            SPI_Write(FIFODataReg, sendData[o])
        }
        SPI_Write(CommandReg, command)

        if (command == PCD_TRANSCEIVE){
            SetBits(BitFramingReg, 0x80)
        }

        let p = 2000
        while (true){
            n = SPI_Read(ComIrqReg)
            p --
            if (~(p != 0 && ~(n & 0x01) && ~(n & waitIRQ))) {
                break
            }
        }
        ClearBits(BitFramingReg, 0x80)

        if (p != 0){
            if ((SPI_Read(0x06) & 0x1B) == 0x00){
                status = 0
                    if (n & irqEN & 0x01){
                    status = 1
                }
                if (command == PCD_TRANSCEIVE){
                    n = SPI_Read(FIFOLevelReg)
                    lastBits = SPI_Read(ControlReg) & 0x07
                    if (lastBits != 0){
                        returnLen = (n -1)*8+lastBits
                    }
                    else{
                        returnLen = n * 8
                    }
                    if (n == 0){
                        n = 1
                    }
                    if (n > MAX_LEN){
                        n = MAX_LEN
                    }
                    for (let q=0;q<n;q++){
                        returnData.push(SPI_Read(FIFODataReg))
                    }
                }
            }
            else{
                status = 2
            }
        }

        return [status, returnData, returnLen]
    }

    function TagSelect (SerNum: number[]) {
        let buff: number[] = []
        buff.push(0x93)
        buff.push(0x70)
        for (let r=0;r<5;r++){
            buff.push(SerNum[r])
        }

        let pOut = CRC_Calculation(buff)
        buff.push(pOut[0])
        buff.push(pOut[1])
        let [status, returnData, returnLen] = MFRC522_ToCard(PCD_TRANSCEIVE, buff)
        if ((status == 0) && (returnLen == 0x18)){
            return returnData[0]
        }
        else{
            return 0
        }
    }

    function CRC_Calculation (DataIn: number[]) {
        ClearBits(DivIrqReg, 0x04)
        SetBits(FIFOLevelReg, 0x80)
        for ( let s=0;s<(DataIn.length);s++){
            SPI_Write(FIFODataReg, DataIn[s])
        }
        SPI_Write(CommandReg, 0x03)
        let t = 0xFF

        while (true){
            let v = SPI_Read(DivIrqReg)
            t--
            if (!(t != 0 && !(v & 0x04))){
                break
            }
        }

        let DataOut: number[] = []
        DataOut.push(SPI_Read(0x22))
        DataOut.push(SPI_Read(0x21))
        return DataOut
    }

    function WriteRFID (blockAdr: number, writeData: number[]) {
        let buff: number[] = []
        let crc: number[] = []

        buff.push(0xA0)
        buff.push(blockAdr)
        crc = CRC_Calculation(buff)
        buff.push(crc[0])
        buff.push(crc[1])
        let [status, returnData, returnLen] = MFRC522_ToCard(PCD_TRANSCEIVE, buff)
        if ((status != 0) || (returnLen!=4) || ((returnData[0]&0x0F) != 0x0A)){
            status = 2
            serial.writeLine("ERROR")
        }

        if (status == 0) {
            let buff2 : number []= []
            for (let w=0;w<16;w++){
                buff2.push(writeData[w])
            }
            crc = CRC_Calculation(buff2)
            buff2.push(crc[0])
            buff2.push(crc[1])
            let [status, returnData, returnLen] = MFRC522_ToCard(PCD_TRANSCEIVE, buff2)
            if ((status!=0)||(returnLen!=4)||((returnData[0]&0x0F)!=0x0A)){
                serial.writeLine("Error while writing")
            }
            else{
                serial.writeLine("Data written")
            }
        }
    }

    function getIDNum(uid: number[]){
        let a= 0

        for (let e=0;e<5;e++){
            a = a*256+uid[e]
        }
        return a
    }

    function readID() {
        [status, Type2] = Request(PICC_REQIDL)

        if (status != 0) {
            return null
        }
        [status, uid] = AvoidColl()

        if (status != 0) {
            return null
        }

        return getIDNum(uid)
    }

    /*
     * Initial setup
     */
    //% block="Initialize MFRC522 Module"
    //% weight=100
   export function Init() {
       pins.spiPins(DigitalPin.P15, DigitalPin.P14, DigitalPin.P13)
       pins.spiFormat(8, 0)
       pins.digitalWritePin(DigitalPin.P16, 1)

       // reset module
       SPI_Write(CommandReg, PCD_RESETPHASE)

       SPI_Write(0x2A, 0x8D)
       SPI_Write(0x2B, 0x3E)
       SPI_Write(0x2D, 30)
       SPI_Write(0x2E, 0)
       SPI_Write(0x15, 0x40)
       SPI_Write(0x11, 0x3D)
       AntennaON()
   }

   /*
    * Function to read ID from card
    */
   //% block="Read ID"
   //% weight=95
   export function getID() {
       let id = readID()
       while (!(id)) {
           id = readID()
           if (id!=undefined){
               return id
           }
       }
       return id
   }

    /*
     * Function to read Data from card
     */
    //% block="Read data"
    //% weight=90
   export function read():string {
       let text = readFromCard()
       while (!text) {
           let text = readFromCard()

           if (text!=''){
               return text
           }
       }
       return text
   }




   /*
    * Function to write Data
    */
   //% block="Write Data %text"
   //% text
   //% weight=85
  export function write (text: string) {
      let id = writeToCard(text)

      while (!id) {
          let id = writeToCard(text)

          if (id != undefined){
              return
          }
      }
      return
  }

  /*
   * TUrn off antenna
   */
  //% block="Turn off antenna"
  //% text
  //% weight=80
  export function AntennaOff () {
      ClearBits(TxControlReg, 0x03)
  }

}
