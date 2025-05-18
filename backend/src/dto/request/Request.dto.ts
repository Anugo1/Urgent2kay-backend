export interface CreateRequestDto {
    name: string;
    notes?: string;
    supporterId?: string;
    billIds: string[]; 
  }

  export interface GetRequestsDto {
    requesterId?: string;
    supporterId?: string;
  }
  

 